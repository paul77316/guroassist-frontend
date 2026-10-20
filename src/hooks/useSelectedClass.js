import { useSearchParams } from 'react-router-dom';
import { useClasses } from './useClasses';

/** The class picked on the assignment pages, kept in the URL (?class=ID) so tabs and links share it. */
export function useSelectedClass() {
  const { data: classes = [], isLoading } = useClasses();
  const [params, setParams] = useSearchParams();

  const requested = params.get('class');
  const valid = classes.some((c) => String(c.id) === requested);
  const classId = valid ? requested : classes[0] ? String(classes[0].id) : '';

  return {
    classes,
    isLoading,
    classId,
    cls: classes.find((c) => String(c.id) === classId),
    setClassId: (id) => setParams({ class: String(id) }, { replace: true }),
  };
}
