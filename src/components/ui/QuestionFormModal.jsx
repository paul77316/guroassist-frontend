import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FormField, { inputCls } from './FormField';
import MathText from './MathText';
import QuestionImage from './QuestionImage';
import {
  useCompetencies, useCreateCompetency, useCreateQuestion, useUpdateQuestion,
  useUploadQuestionImage, useRemoveQuestionImage,
} from '../../hooks/useExams';
import { applyServerErrors } from '../../utils/formErrors';
import { firstError } from '../../utils/errors';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 2048 * 1024; // the server enforces the same limit

const schema = z.object({
  body: z.string().trim().min(1, 'Write the question').max(2000, 'Keep it under 2000 characters'),
  choices: z.array(
    z.object({ text: z.string().trim().min(1, 'Required').max(300, 'Keep it under 300 characters') })
  ),
  correct_choice: z.string().min(1, 'Choose the correct answer'),
  competency_id: z.string().min(1, 'Choose a competency'),
  alt: z.string().max(255, 'Keep it under 255 characters').optional(),
});

const FIELDS = ['body', 'choices', 'correct_choice', 'competency_id'];

/**
 * Add (setId given) or edit (question given) one question.
 * choiceCount: 4 or 5, from the exam. The image is uploaded after the question is saved.
 * If the question saves but the image fails, the window stays open in edit mode so nothing is saved twice.
 */
export default function QuestionFormModal({ setId, choiceCount, question, onClose, onSaved }) {
  // The question as it exists on the server. It changes after a save, an upload or an image removal.
  const [live, setLive] = useState(question ?? null);
  const isEdit = !!live;
  const count = live ? live.choices.length : choiceCount;

  const { data: competencies = [], isError: competenciesError } = useCompetencies();
  const createCompetency = useCreateCompetency();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const uploadImage = useUploadQuestionImage();
  const removeImage = useRemoveQuestionImage();

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [competencyError, setCompetencyError] = useState('');
  const [pendingCompetency, setPendingCompetency] = useState(null);

  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: live
      ? {
          body: live.body,
          choices: live.choices.map((t) => ({ text: t })),
          correct_choice: live.correct_choice,
          competency_id: live.competency ? String(live.competency.id) : '',
          alt: '',
        }
      : {
          body: '',
          choices: Array.from({ length: choiceCount }, () => ({ text: '' })),
          correct_choice: '',
          competency_id: '',
          alt: '',
        },
  });

  const watched = watch();

  // A temporary address for the picture the teacher just chose, so it can be previewed before saving.
  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return undefined;
    }
    const u = URL.createObjectURL(file);
    setFileUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // After "Add competency", select it as soon as it appears in the list.
  useEffect(() => {
    if (pendingCompetency && competencies.some((c) => c.id === pendingCompetency)) {
      setValue('competency_id', String(pendingCompetency), { shouldValidate: true });
      setPendingCompetency(null);
    }
  }, [pendingCompetency, competencies, setValue]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFileError('');
    if (!f) {
      setFile(null);
      return;
    }
    if (!IMAGE_TYPES.includes(f.type)) {
      setFileError('Use a PNG, JPG or WebP image.');
      e.target.value = '';
      setFile(null);
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setFileError('The image must be 2 MB or smaller.');
      e.target.value = '';
      setFile(null);
      return;
    }
    setFile(f);
  };

  const onAddCompetency = () => {
    const name = newName.trim();
    if (!name) return;
    setCompetencyError('');
    createCompetency.mutate(
      { name },
      {
        onSuccess: (c) => {
          setNewName('');
          setAdding(false);
          setPendingCompetency(c.id);
        },
        onError: (err) => setCompetencyError(firstError(err, 'Could not add the competency.')),
      }
    );
  };

  const onRemoveImage = () => {
    setFormError('');
    removeImage.mutate(live.id, {
      onSuccess: () => setLive({ ...live, has_image: false, image_url: null, image_alt: null }),
      onError: (err) => setFormError(firstError(err, 'Could not remove the image.')),
    });
  };

  const onSubmit = async (v) => {
    setFormError('');
    const payload = {
      body: v.body.trim(),
      choices: v.choices.map((c) => c.text.trim()),
      correct_choice: v.correct_choice,
      competency_id: Number(v.competency_id),
    };

    let stage = 'question';
    try {
      let saved = isEdit
        ? await updateQuestion.mutateAsync({ id: live.id, ...payload })
        : await createQuestion.mutateAsync({ setId, ...payload });
      setLive(saved);

      if (file) {
        stage = 'image';
        saved = await uploadImage.mutateAsync({ id: saved.id, file, alt: v.alt?.trim() || '' });
        setLive(saved);
      }

      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (stage === 'image') {
        setFormError(`The question was saved, but the image was not. ${firstError(err, 'Could not upload the image.')}`);
      } else if (err?.errors) {
        applyServerErrors(err, setError, FIELDS);
      } else {
        setFormError(firstError(err, 'Could not save the question.'));
      }
    }
  };

  const saving = createQuestion.isPending || updateQuestion.isPending || uploadImage.isPending;
  const showAdd = adding || competencies.length === 0;
  const choiceError = errors.choices?.message ?? errors.choices?.root?.message;

  return (
    <Modal title={isEdit ? 'Edit question' : 'Add question'} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Question"
          error={errors.body?.message}
          hint="Write formulas between dollar signs, for example $x^2 + 3x$. Use \$ for a plain dollar sign."
        >
          <textarea rows={4} className={inputCls} {...register('body')} />
        </FormField>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Choices - pick the correct one</p>
          <div className="space-y-2">
            {Array.from({ length: count }, (_, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={LETTERS[i]}
                    aria-label={`Choice ${LETTERS[i]} is correct`}
                    {...register('correct_choice')}
                  />
                  <span className="w-5 text-sm font-semibold text-gray-700">{LETTERS[i]}</span>
                  <input
                    type="text"
                    className={inputCls}
                    aria-label={`Choice ${LETTERS[i]}`}
                    {...register(`choices.${i}.text`)}
                  />
                </div>
                {errors.choices?.[i]?.text && (
                  <p className="ml-12 mt-0.5 text-xs text-red-600">{errors.choices[i].text.message}</p>
                )}
              </div>
            ))}
          </div>
          {choiceError && <p className="mt-1 text-xs text-red-600">{choiceError}</p>}
          {errors.correct_choice && <p className="mt-1 text-xs text-red-600">{errors.correct_choice.message}</p>}
        </div>

        <FormField label="Competency" error={errors.competency_id?.message}>
          {competenciesError ? (
            <p className="text-sm text-red-600">Could not load your competencies.</p>
          ) : (
            <>
              {competencies.length > 0 && (
                <select className={inputCls} {...register('competency_id')}>
                  <option value="">Choose...</option>
                  {competencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {showAdd ? (
                <div className={competencies.length > 0 ? 'mt-2' : ''}>
                  {competencies.length === 0 && (
                    <p className="mb-1 text-xs text-gray-500">
                      You have no competencies yet. Add one to tag this question.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={inputCls}
                      value={newName}
                      maxLength={120}
                      placeholder="New competency"
                      aria-label="New competency"
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={onAddCompetency}
                      disabled={createCompetency.isPending || !newName.trim()}
                      className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {createCompetency.isPending ? 'Adding...' : 'Add'}
                    </button>
                    {competencies.length > 0 && (
                      <button type="button" onClick={() => setAdding(false)} className="shrink-0 rounded-md border px-3 py-2 text-sm">
                        Cancel
                      </button>
                    )}
                  </div>
                  {competencyError && <p className="mt-1 text-xs text-red-600">{competencyError}</p>}
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="mt-2 text-sm text-blue-600 hover:underline">
                  Add a new competency
                </button>
              )}
            </>
          )}
        </FormField>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Image (optional)</p>
          {live?.has_image && !file && (
            <div className="mb-2">
              <QuestionImage question={live} />
              <button
                type="button"
                onClick={onRemoveImage}
                disabled={removeImage.isPending}
                className="mt-1 text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                {removeImage.isPending ? 'Removing...' : 'Remove image'}
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPickFile}
            className="block w-full text-sm text-gray-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPG or WebP, up to 2 MB. Use it for a graph or a figure. {live?.has_image ? 'Choosing a file replaces the current image.' : ''}
          </p>
          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          {file && (
            <div className="mt-2 space-y-2">
              {fileUrl && <img src={fileUrl} alt="" className="max-h-48 max-w-full rounded border border-gray-200 object-contain" />}
              <FormField label="Describe the image (alt text)" error={errors.alt?.message} hint="Read out to students who cannot see the picture.">
                <input type="text" className={inputCls} {...register('alt')} />
              </FormField>
            </div>
          )}
          {live?.has_image && !file && live.image_alt && (
            <p className="mt-1 text-xs text-gray-500">Alt text: {live.image_alt}. To change it, choose the image again.</p>
          )}
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</p>
          {watched.body?.trim() ? (
            <MathText text={watched.body} className="mt-2 block text-sm text-gray-900" />
          ) : (
            <p className="mt-2 text-sm text-gray-400">The question appears here as you type.</p>
          )}
          {file && fileUrl && <img src={fileUrl} alt="" className="mt-2 max-h-40 max-w-full rounded border border-gray-200 object-contain" />}
          {!file && live?.has_image && <div className="mt-2"><QuestionImage question={live} /></div>}
          <ul className="mt-2 space-y-1">
            {Array.from({ length: count }, (_, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-800">
                <span className="w-5 shrink-0 font-semibold">{LETTERS[i]}.</span>
                <MathText text={watched.choices?.[i]?.text ?? ''} />
                {watched.correct_choice === LETTERS[i] && <span className="text-xs text-green-700">(correct)</span>}
              </li>
            ))}
          </ul>
        </div>

        {(formError || errors.root) && <p className="text-sm text-red-600">{formError || errors.root.message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}