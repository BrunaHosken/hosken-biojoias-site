import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";
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
  useEffect(() => setSelectedImage(0), [product.id]);
  return (
    <div className="product-gallery">
      <PieceArt product={product} imageUrl={images[selectedImage]} />
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
    </div>
  );
}
