import { motion } from "framer-motion";

const ImageStack = ({images}) => {
  return (
    <div className="w-full absolute h-[calc(100%+160px)]">
      {images.map((src, index) => (
        <motion.img
          key={index}
          src={src}
          alt={`Segment ${index + 1}`}
          className="bg-cover bg-center absolute top-0 left-0 w-full"
          style={{ position: "relative", marginTop: index === 0 ? 0 : "-1030px" }}
          initial={{ y: 1500, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.6, delay: index * 0.2, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

export default ImageStack;
