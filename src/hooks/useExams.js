import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExamOptions, listCompetencies, createCompetency, updateCompetency, deleteCompetency,
  listExams, getExam, createExam, updateExam, deleteExam, restoreExam,
  addSet, getExamSet, deleteExamSet,
  createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  uploadQuestionImage, removeQuestionImage, getQuestionImage,
} from '../services/examService';

export const useExamOptions = () =>
  useQuery({ queryKey: ['exam-options'], queryFn: getExamOptions, staleTime: Infinity });

export const useCompetencies = () => useQuery({ queryKey: ['competencies'], queryFn: listCompetencies });

export const useExams = (classId, trashed) =>
  useQuery({
    queryKey: ['exams', classId || '', !!trashed],
    queryFn: () => listExams({ classId, trashed }),
  });

export const useExam = (id) =>
  useQuery({ queryKey: ['exam', String(id)], queryFn: () => getExam(id), enabled: !!id, retry: false });

export const useExamSet = (id) =>
  useQuery({ queryKey: ['exam-set', String(id)], queryFn: () => getExamSet(id), enabled: !!id, retry: false });

// The key holds the image address with its version, so a replaced image is fetched again.
export const useQuestionImage = (question) =>
  useQuery({
    queryKey: ['exam-question-image', question?.id, question?.image_url],
    queryFn: () => getQuestionImage(question.id),
    enabled: !!question?.has_image,
    staleTime: Infinity,
  });

// Any change to an exam, a set, a question or a competency can change the lists, the detail and the counts.
const REFRESH = ['exams', 'exam', 'exam-set', 'competencies'];

function useRefreshingMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}

export const useCreateCompetency = () => useRefreshingMutation(createCompetency);
export const useUpdateCompetency = () => useRefreshingMutation(updateCompetency);
export const useDeleteCompetency = () => useRefreshingMutation(deleteCompetency);

export const useCreateExam = () => useRefreshingMutation(createExam);
export const useUpdateExam = () => useRefreshingMutation(updateExam);
export const useDeleteExam = () => useRefreshingMutation(deleteExam);
export const useRestoreExam = () => useRefreshingMutation(restoreExam);

export const useAddSet = () => useRefreshingMutation(addSet);
export const useDeleteSet = () => useRefreshingMutation(deleteExamSet);

export const useCreateQuestion = () => useRefreshingMutation(createQuestion);
export const useUpdateQuestion = () => useRefreshingMutation(updateQuestion);
export const useDeleteQuestion = () => useRefreshingMutation(deleteQuestion);
export const useReorderQuestions = () => useRefreshingMutation(reorderQuestions);
export const useUploadQuestionImage = () => useRefreshingMutation(uploadQuestionImage);
export const useRemoveQuestionImage = () => useRefreshingMutation(removeQuestionImage);