export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
	return (
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
			<div className={`max-h-[92dvh] w-full ${maxWidth} overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-h-[90vh] sm:rounded-lg sm:p-6`}>
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
					<button
						onClick={onClose}
						className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
						aria-label="Close"
					>
						✕
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}
