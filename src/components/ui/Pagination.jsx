export default function Pagination({ meta, noun, busy, onPage, onPerPage }) {
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;
  const from = meta?.from ?? 0;
  const to = meta?.to ?? 0;

  // Only hide completely if there are no results at all
  if (total === 0) return null;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= lastPage && !busy) {
      onPage(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = lastPage > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(lastPage);
      } else if (currentPage >= lastPage - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = lastPage - 4; i <= lastPage; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(lastPage);
      }
    }

    return pages;
  };

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="text-sm text-gray-600">
        Showing {from} to {to} of {total} {noun}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              disabled={busy}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                page === currentPage
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === lastPage || busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>

        <select
          value={meta?.per_page ?? 20}
          onChange={(e) => onPerPage(Number(e.target.value))}
          disabled={busy}
          className="ml-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
}
