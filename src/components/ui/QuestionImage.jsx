import { useEffect, useState } from 'react';
import { useQuestionImage } from '../../hooks/useExams';

/** The image of a question. It is fetched with the login cookie and shown from a temporary address. */
export default function QuestionImage({ question, className = '' }) {
  const { data: blob, isLoading, isError } = useQuestionImage(question);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!question?.has_image) return null;
  if (isLoading) return <p className="text-xs text-gray-400">Loading image...</p>;
  if (isError || !url) return <p className="text-xs text-red-600">Could not load the image.</p>;

  return (
    <img
      src={url}
      alt={question.image_alt ?? ''}
      className={`max-h-64 max-w-full rounded border border-gray-200 object-contain ${className}`}
    />
  );
}