export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-lg bg-white p-6 shadow-xl`}>
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