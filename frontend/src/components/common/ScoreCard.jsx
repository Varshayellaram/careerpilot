// Reusable score display card
// Used by ATS scorer to show category scores
const ScoreCard = ({ title, score, maxScore, color = 'blue' }) => {
  const percentage = Math.round((score / maxScore) * 100);

  const colorMap = {
    blue: 'bg-blue-600',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-600';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <span className="text-sm font-bold text-slate-800">
          {score}/{maxScore}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-slate-500 mt-1">{percentage}%</p>
    </div>
  );
};

export default ScoreCard;