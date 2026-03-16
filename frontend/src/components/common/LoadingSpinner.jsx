// Reusable loading spinner
// Used when any agent is processing
const LoadingSpinner = ({ message = 'Processing...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-blue-100"></div>
        {/* Spinning ring */}
        <div className="w-16 h-16 rounded-full border-4 border-blue-600 
                        border-t-transparent animate-spin absolute top-0 left-0">
        </div>
      </div>
      <p className="mt-4 text-slate-600 font-medium">{message}</p>
    </div>
  );
};

export default LoadingSpinner;