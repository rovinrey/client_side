interface WelcomeBannerProps {
  text: string;
}

const WelcomeBanner = ({ text }: WelcomeBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-teal-700 to-teal-600 p-6 rounded-xl text-white shadow-lg">
      <h2 className="text-2xl md:text-3xl font-bold">{text}</h2>
      <p className="text-teal-100 mt-1">PESO Juban — Trabaho at Serbisyo para sa Jubanon</p>
    </div>  
  );
};

export default WelcomeBanner;