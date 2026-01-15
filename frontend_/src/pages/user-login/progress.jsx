import  useLoginStore  from "../../store/useLoginStore"
import useThemeStore from "../../store/theme"

const ProgressBar = () => {
  const step = useLoginStore((state) => state.step);
  const theme = useThemeStore((state) => state.theme);

  return (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      />
    </div>
  );
};

export default ProgressBar;
