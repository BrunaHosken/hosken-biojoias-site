import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";
import { ImageLightbox } from "../../../components/ImageLightbox";
import { availability } from "../../../app/constants";
import type { Product } from "../../../data";
import { getProductAvailability } from "../../../data";
import { getProductImages } from "../productImages";

export function PieceArt({
  product,
  imageUrl,
}: {
  product: Product;
  imageUrl?: string;
}) {
  const image = imageUrl ?? getProductImages(product)[0] ?? "";
  return (
    <div className="piece-art">
      {image ? (
        <img src={image} alt={product.name} decoding="async" />
      ) : (
        <>
          <Flower2 strokeWidth={0.65} />
          <small>FOTOGRAFIA EM BREVE</small>
        </>
      )}
      <span className="tag">
        {availability[getProductAvailability(product)]}
      </span>
    </div>
  );
}
export function ProductGallery({ product }: { product: Product }) {
  const images = getProductImages(product);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxImage, setLightboxImage] = useState("");
  useEffect(() => setSelectedImage(0), [product.id]);
  return (
    <div className="product-gallery">
      <button
        className="product-gallery-main"
        type="button"
        aria-label="Ampliar foto do produto"
        onClick={() => images[selectedImage] && setLightboxImage(images[selectedImage])}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 100;
          const y = ((event.clientY - bounds.top) / bounds.height) * 100;
          event.currentTarget.style.setProperty("--zoom-x", `${x}%`);
          event.currentTarget.style.setProperty("--zoom-y", `${y}%`);
        }}
      >
        <PieceArt product={product} imageUrl={images[selectedImage]} />
      </button>
      {images.length > 1 && (
        <div className="product-thumbnails" aria-label="Fotos do produto">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              className={selectedImage === index ? "selected" : ""}
              aria-label={`Ver foto ${index + 1} de ${images.length}`}
              aria-pressed={selectedImage === index}
              onClick={() => setSelectedImage(index)}
            >
              <img src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt={product.name}
          onClose={() => setLightboxImage("")}
        />
      )}
    </div>
  );
}
