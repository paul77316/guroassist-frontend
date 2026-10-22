# Caching Optimization Guide for GuroAssist

This guide provides a comprehensive caching strategy to optimize your application performance.

## Why Add Caching?

Your current app has several **computationally expensive operations**:
- Dashboard "Today" summary (multiple service calls)
- Attendance summaries (complex calculations per student)
- Students to review (HEAVY computation - marked in your code)
- Lookup data (fetched on every request)

Adding caching will:
- ✅ Reduce database queries by 60-80%
- ✅ Improve API response times significantly
- ✅ Reduce server load on spare PC
- ✅ Better user experience

---

## Caching Strategy Overview

### Priority 1: Static Lookup Data (Immediate Impact)
- Grade levels, subjects, academic years, terms
- Cache duration: 1 day
- Impact: High, Risk: None

### Priority 2: Dashboard Summary (High Impact)
- Today's summary, follow-ups due, students to review
- Cache duration: 5-15 minutes
- Impact: Very High, Risk: Low

### Priority 3: Attendance Reports (Medium Impact)
- Attendance summaries, student history
- Cache duration: 30 minutes to 1 hour
- Impact: Medium, Risk: Low

### Priority 4: Monitoring Settings (Low Impact)
- Teacher-specific thresholds
- Cache duration: 1 hour
- Impact: Low, Risk: Low

---

## Implementation Guide

### Step 1: Install Redis (Recommended for Production)

While your app works with database cache, Redis is **much better** for production caching due to:
- Faster read/write operations
- Better for frequent cache hits
- Automatic key expiration
- Lower memory overhead

**On Spare PC (Windows)**:
```powershell
# Download Redis for Windows
# Visit: https://github.com/microsoftarchive/redis/releases
# Download: Redis-x64-3.2.100.zip
# Extract to: C:\Redis

# Run as service
cd C:\Redis
redis-server.exe --service-install
redis-server.exe --service-start

# Verify
redis-cli ping
# Should return: PONG
```

**On Linux/Mac**:
```bash
sudo apt-get install redis-server  # Ubuntu/Debian
sudo systemctl start redis
```

### Step 2: Update Configuration

Update `.env`:
```env
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database  # Keep queue as database
```

Update `config/cache.php`:
```php
'default' => env('CACHE_STORE', 'redis'),
```

### Step 3: Implement Caching

#### 3.1 Cache Lookup Data (Easiest Win)

Edit `app/Http/Controllers/Api/LookupController.php`:

```php
<?php

namespace App\Http\Controllers\Api;
use App\Models\Term;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class LookupController extends Controller
{
    public function gradeLevels(): JsonResponse
    {
        return response()->json([
            'data' => Cache::remember('grade_levels', now()->addDay(), function () {
                return GradeLevel::orderBy('order')->orderBy('id')->get();
            })
        ]);
    }

    public function subjects(): JsonResponse
    {
        return response()->json([
            'data' => Cache::remember('subjects', now()->addDay(), function () {
                return Subject::orderBy('name')->get();
            })
        ]);
    }

    public function academicYears(): JsonResponse
    {
        return response()->json([
            'data' => Cache::remember('academic_years', now()->addDay(), function () {
                return AcademicYear::orderByDesc('id')->get();
            })
        ]);
    }

    public function terms(Request $request): JsonResponse
    {
        $cacheKey = 'terms_' . ($request->academic_year_id ?? 'all');

        $terms = Cache::remember($cacheKey, now()->addDay(), function () use ($request) {
            return Term::query()
                ->when($request->academic_year_id, fn ($q, $id) => $q->where('academic_year_id', $id))
                ->orderBy('academic_year_id')
                ->orderBy('sort_order')
                ->get();
        });

        return response()->json(['data' => $terms]);
    }
}
```

**Impact**: These endpoints are called on every page load. Caching them eliminates database queries for static data.

---

#### 3.2 Cache Monitoring Settings

Edit `app/Services/AttendanceSummaryService.php`:

```php
public function settingsForTeacher(?int $teacherId): array
{
    $cacheKey = "monitoring_settings_{$teacherId}";

    return Cache::remember($cacheKey, now()->addHour(), function () use ($teacherId) {
        $row = $teacherId ? MonitoringSetting::where('teacher_id', $teacherId)->first() : null;

        return [
            'attendance_rate_threshold' => (float) ($row?->attendance_rate_threshold ?? config('monitoring.attendance_rate_threshold')),
            'consecutive_absence_threshold' => (int) ($row?->consecutive_absence_threshold ?? config('monitoring.consecutive_absence_threshold')),
            'min_days_for_rate' => (int) ($row?->min_days_for_rate ?? config('monitoring.min_days_for_rate')),
            'missing_assignments_threshold' => (int) ($row?->missing_assignments_threshold ?? config('monitoring.missing_assignments_threshold')),
            'guardian_email_enabled' => (bool) ($row?->guardian_email_enabled ?? false),
            'notify_on_absent' => (bool) ($row?->notify_on_absent ?? true),
            'notify_on_late' => (bool) ($row?->notify_on_late ?? false),
        ];
    });
}
```

**Add cache invalidation** when settings change:
```php
// In MonitoringSettingController.php (create/update methods)
public function update(Request $request, MonitoringSetting $setting)
{
    $setting->update($request->validated());

    // Clear cache
    Cache::forget("monitoring_settings_{$setting->teacher_id}");

    return response()->json($setting);
}
```

---

#### 3.3 Cache Dashboard Summary (Biggest Impact)

Edit `app/Services/TodaySummaryService.php`:

```php
use Illuminate\Support\Facades\Cache;

class TodaySummaryService
{
    public function summary(User $user): array
    {
        if (! $user->teacher) {
            return ['applies' => false];
        }

        $today = $this->guard->today();
        $cacheKey = "dashboard_summary_{$user->id}_{$today}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($user, $today) {
            return [
                'applies' => true,
                'today' => $today,
                'follow_ups_due' => $this->followUpsDue($user, $today),
                'students_to_review' => $this->studentsToReview($user),
                'active_interventions' => $this->activeInterventions($user, $today),
            ];
        });
    }

    // ... rest of the methods
}
```

**Cache invalidation**:
```php
// Add this method to TodaySummaryService
public function clearDashboardCache(User $user): void
{
    $today = $this->guard->today();
    Cache::forget("dashboard_summary_{$user->id}_{$today}");
}

// Call this when:
// - Intervention is created/updated
// - Parent communication is created/updated
// - Attendance is marked
// - Assignment is updated
```

---

#### 3.4 Cache Students to Review (HEAVY Computation)

Edit `app/Services/StudentsToReviewService.php`:

```php
use Illuminate\Support\Facades\Cache;

class StudentsToReviewService
{
    public function forUser(User $user): array
    {
        $today = $this->guard->today();
        $cacheKey = "students_to_review_{$user->id}_{$today}";

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($user, $today) {
            $from = Carbon::parse($today)->subDays(self::DAYS - 1)->toDateString();
            $period = ['from' => $from, 'to' => $today];

            $teacher = $user->teacher;
            if (! $teacher) {
                return ['students' => [], 'classes' => [], 'period' => $period, 'today' => $today, 'handled_days' => self::HANDLED_DAYS];
            }

            // ... rest of the existing logic
        });
    }

    public function clearReviewCache(User $user): void
    {
        $today = $this->guard->today();
        Cache::forget("students_to_review_{$user->id}_{$today}");
    }
}
```

---

#### 3.5 Cache Attendance Summaries

Edit `app/Services/AttendanceSummaryService.php`:

```php
use Illuminate\Support\Facades\Cache;

class AttendanceSummaryService
{
    public function summary(ClassAssignment $ca, string $from, string $to): array
    {
        $cacheKey = "attendance_summary_{$ca->id}_{$from}_{$to}";

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($ca, $from, $to) {
            $cfg = $this->settingsForTeacher($ca->teacher_id);
            $roster = $this->attendance->roster($ca);

            $records = Attendance::where('class_assignment_id', $ca->id)
                ->whereBetween('attendance_date', [$from, $to])
                ->get(['student_id', 'attendance_date', 'status'])
                ->map(fn ($r) => [
                    'student_id' => $r->student_id,
                    'date' => Carbon::parse($r->attendance_date)->format('Y-m-d'),
                    'status' => $r->status,
                ]);

            $classDates = $records->pluck('date')->unique()->sort()->values();
            $byStudent = $records->groupBy('student_id');

            $students = $roster
                ->map(fn ($s) => $this->student($s, $byStudent->get($s->id, collect()), $classDates, $cfg))
                ->values();

            $attended = $students->sum(fn ($r) => $r['present'] + $r['late']);
            $counted = $students->sum('days_counted');

            return [
                'period' => ['from' => $from, 'to' => $to],
                'settings' => $cfg,
                'class_days' => $classDates->count(),
                'students' => $students,
                'summary' => [
                    'student_count' => $students->count(),
                    'class_rate' => $counted > 0 ? round($attended / $counted * 100, 1) : null,
                    'needs_review_count' => $students->where('needs_review', true)->count(),
                ],
            ];
        });
    }

    public function clearAttendanceCache(ClassAssignment $ca, string $from, string $to): void
    {
        $cacheKey = "attendance_summary_{$ca->id}_{$from}_{$to}";
        Cache::forget($cacheKey);
    }
}
```

---

### Step 4: Cache Invalidation Strategy

Create a trait for cache clearing:

```php
// app/Traits/FlushesCache.php
<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;

trait FlushesCache
{
    protected function flushCacheByPattern(string $pattern): void
    {
        // For Redis
        if (config('cache.default') === 'redis') {
            $redis = Cache::getStore()->connection();
            $keys = $redis->keys($pattern);
            if (!empty($keys)) {
                $redis->del($keys);
            }
        }
        // For database cache, you'd need to query the cache table
    }
}
```

**Add cache clearing in controllers**:

```php
// In AttendanceController.php
public function bulkStore(BulkStoreAttendanceRequest $request)
{
    $attendance = Attendance::bulkStore($request->validated());

    // Clear relevant caches
    $ca = ClassAssignment::find($request->class_assignment_id);
    Cache::forget("students_to_review_{$request->user()->id}_{$this->guard->today()}");
    Cache::forget("dashboard_summary_{$request->user()->id}_{$this->guard->today()}");

    return response()->json($attendance);
}
```

---

### Step 5: Add Cache Health Check

Create a route to monitor cache:

```php
// routes/api.php
Route::middleware('auth:sanctum')->get('/cache/stats', function () {
    $redis = Cache::getStore()->connection();
    $info = $redis->info('stats');

    return response()->json([
        'driver' => config('cache.default'),
        'keys' => $redis->dbSize(),
        'hits' => $info['keyspace_hits'] ?? 0,
        'misses' => $info['keyspace_misses'] ?? 0,
    ]);
});
```

---

## Cache Key Naming Convention

Use consistent, descriptive keys:

```
# Static data
grade_levels
subjects
academic_years
terms_{academic_year_id}

# User-specific
dashboard_summary_{user_id}_{date}
students_to_review_{user_id}_{date}
monitoring_settings_{teacher_id}

# Class-specific
attendance_summary_{class_id}_{from}_{to}
class_roster_{class_id}

# Student-specific
student_profile_{student_id}
student_attendance_{student_id}_{class_id}_{from}_{to}
```

---

## Cache Duration Recommendations

| Data Type | Duration | Reason |
|-----------|----------|--------|
| Grade levels, subjects | 1 day | Rarely changes |
| Academic years, terms | 1 day | Changes at term boundaries |
| Monitoring settings | 1 hour | User configurable |
| Dashboard summary | 5-15 minutes | Changes frequently |
| Students to review | 15 minutes | HEAVY computation |
| Attendance summary | 30 minutes | Historical data |
| Student profile | 1 hour | Personal data |

---

## Testing Caching

### 1. Verify Cache is Working

```php
// In a controller or tinker
use Illuminate\Support\Facades\Cache;

Cache::put('test', 'value', 60);
$value = Cache::get('test');
Cache::forget('test');
```

### 2. Measure Performance Impact

```php
// Add timing to controller
$startTime = microtime(true);

// Your code here

$duration = (microtime(true) - $startTime) * 1000;
Log::info("Endpoint took {$duration}ms");
```

### 3. Monitor Cache Hit Rate

Use the `/cache/stats` endpoint to track:
- Hit rate = hits / (hits + misses)
- Aim for > 70% hit rate
- Total keys stored

---

## Rollback Plan

If caching causes issues:

1. **Disable cache temporarily**:
```env
CACHE_DRIVER=array  # In-memory, no persistence
```

2. **Clear all cache**:
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

3. **For Redis**:
```bash
redis-cli FLUSHALL
```

---

## Performance Expectations

Without caching:
- Dashboard load: 500-1000ms
- Students to review: 1000-2000ms (HEAVY)
- Lookup endpoints: 50-100ms each

With caching:
- Dashboard load: 50-100ms (after first hit)
- Students to review: 50-100ms (after first hit)
- Lookup endpoints: 5-10ms (after first hit)

**Expected improvement: 80-90% faster response times**

---

## Migration to Spare PC

Update your migration guide to include Redis:

```env
# In spare PC .env
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
```

Install Redis on spare PC (see Step 1 above).

---

## Summary Checklist

- [ ] Install Redis on spare PC
- [ ] Update .env to use Redis for cache/session
- [ ] Implement lookup data caching (Priority 1)
- [ ] Implement dashboard summary caching (Priority 2)
- [ ] Implement attendance summary caching (Priority 3)
- [ ] Add cache invalidation on data changes
- [ ] Add cache stats endpoint
- [ ] Test cache hit rates
- [ ] Monitor performance improvements

---

## Advanced Optimizations (Future)

### 1. HTTP Caching
Add cache headers to responses:
```php
return response()->json($data)
    ->header('Cache-Control', 'public, max-age=300'); // 5 minutes
```

### 2. Query Result Caching
Cache expensive queries directly:
```php
$students = Cache::remember("students_{$classId}", now()->addHour(), function () use ($classId) {
    return Student::where('class_id', $classId)->with(['section', 'gradeLevel'])->get();
});
```

### 3. Full Page Caching
For static pages, use Laravel's HTTP cache:
```bash
composer require barryvdh/laravel-httpcache
```

### 4. CDN for Static Assets
Use Cloudflare CDN for frontend assets (already in your setup).

---

**Estimated Implementation Time**: 2-4 hours
**Expected Performance Gain**: 70-90% faster API responses
**Maintenance Overhead**: Low (automatic expiration)
