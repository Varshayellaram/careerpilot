// Pipeline progress indicator
// Shows which agent step user is currently on
const ProgressBar = ({ steps, currentStep, completedSteps }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">

        {/* Connecting line behind steps */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${(completedSteps.length / (steps.length - 1)) * 100}%`
            }}
          ></div>
        </div>

        {/* Step circles */}
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;

          return (
            <div key={index} className="flex flex-col items-center z-10">
              {/* Circle */}
              <div className={`w-10 h-10 rounded-full flex items-center 
                              justify-center text-sm font-bold border-2
                              transition-all duration-300
                              ${isCompleted
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : isCurrent
                                  ? 'bg-white border-blue-600 text-blue-600'
                                  : 'bg-white border-slate-300 text-slate-400'
                              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              {/* Label */}
              <span className={`text-xs mt-1 font-medium text-center
                               max-w-16 leading-tight
                               ${isCompleted || isCurrent
                                 ? 'text-blue-600'
                                 : 'text-slate-400'
                               }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;