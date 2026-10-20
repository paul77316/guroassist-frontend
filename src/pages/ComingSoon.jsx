import { useState } from 'react';
import Modal from '../components/ui/Modal';

export default function ComingSoon() {
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
        <button
          onClick={() => setShowInfoModal(true)}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          Add Assignment
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <div className="flex flex-col items-center justify-center p-12">
          <div className="mb-6">
            <iframe
              src="https://lottie.host/embed/b2ad19ff-cae4-41d6-9322-c427be823323/hKS5jqIe1l.lottie"
              width="200"
              height="200"
              frameBorder="0"
              className="mx-auto"
            ></iframe>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Coming Soon
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            This feature is under development. You'll be able to create, manage, and track assignments here.
          </p>
        </div>
      </div>

      {showInfoModal && (
        <Modal
          title="Feature Coming Soon"
          onClose={() => setShowInfoModal(false)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The assignment management feature is currently under development. Once available, you'll be able to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Create and assign tasks to students</li>
              <li>Set due dates and track submissions</li>
              <li>Grade and provide feedback on assignments</li>
              <li>View assignment statistics and reports</li>
            </ul>
            <p className="text-sm text-gray-600">
              We'll notify you when this feature is ready to use.
            </p>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowInfoModal(false)}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Got it
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
