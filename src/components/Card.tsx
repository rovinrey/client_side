interface CardProps {
    title: string;
    value: string;
    trend: string;
    trendLabel: string;
}

function Card({ title, value, trend, trendLabel}: CardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-sm flex justify-between items-start">
            <div className="flex flex-col gap-1">
                {/* Title */}
                <span className="text-gray-500 text-sm font-medium">
                    {title}
                </span>

                {/* Value */}
                <h2 className="text-3xl font-bold text-gray-900 mt-1">
                    {value}
                </h2>

                {/* Trend Indicator */}
                <div className="flex items-center gap-1 mt-2 text-sm">
                    <span className="text-teal-600 font-semibold">
                        {trend}
                    </span>
                    <span className="text-gray-400">
                        {trendLabel}
                    </span>
                </div>
            </div>

            {/* Icon Container */}
            <div className="bg-teal-50 p-3 rounded-xl">

            </div>
        </div>
    );
};


export default Card;