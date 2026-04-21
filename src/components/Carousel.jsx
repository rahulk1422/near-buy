import { useState, useEffect } from "react";

export default function Carousel() {
  const banners = [
    "https://images.unsplash.com/photo-1607083206968-13611e3d76db",
    "https://images.unsplash.com/photo-1607082349566-187342175e2f",
    "https://images.unsplash.com/photo-1607082352121-fa243f3dde32",
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="w-full h-40 sm:h-52 md:h-64 overflow-hidden rounded-lg mb-4">
      <img src={banners[current]} className="w-full h-full object-cover" />
    </div>
  );
}
