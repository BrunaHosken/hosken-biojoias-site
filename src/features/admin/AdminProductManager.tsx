import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { Plus } from "lucide-react";
import { useToast } from "../../app/contexts";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import { ConfirmationModal } from "../../components/Feedback";
import { useRecords, type Product, type Taxonomy } from "../../data";
import { auth, db, storage } from "../../firebase";
import { getProductImages } from "../storefront/productImages";
import { availabilityFromStock } from "../../data/productAvailability";
import { convertToWebp } from "../../utils/convertToWebp";
import { AdminRecordList } from "./AdminRecordList";
import { AdminProductFields } from "./ProductFields";
import { blankProduct } from "./productModel";

type AdminProductManagerProps = {
  onImageUploadStateChange: (uploading: boolean) => void;
};

export function AdminProductManager({
  onImageUploadStateChange,
}: AdminProductManagerProps) {
  const products = useRecords<Product>("products", true);
  const categories = useRecords<Taxonomy>("categories", true);
  const lines = useRecords<Taxonomy>("collections", true);
  const [editing, setEditing] = useState("");
  const [product, setProduct] = useState(blankProduct);
  const [uploadingImages, setUploadingImages] = useState(false);
  const uploadedImagePaths = useRef(new Set<string>());
  const removedImagePaths = useRef(new Set<string>());
  const mounted = useRef(true);
  const notify = useToast();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  async function discardUnsavedImages() {
    const paths = Array.from(uploadedImagePaths.current);
    uploadedImagePaths.current.clear();
    await Promise.allSettled(
      paths.map((path) => deleteObject(storageRef(storage, path))),
    );
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void discardUnsavedImages();
    };
  }, []);

  function removeImage(index: number) {
    const images = product.imageUrls || getProductImages(product);
    const paths = product.imagePaths || images.map(() => "");
    const removedPath = paths[index];
    if (removedPath) removedImagePaths.current.add(removedPath);
    setProduct({
      ...product,
      imageUrls: images.filter((_, imageIndex) => imageIndex !== index),
      imagePaths: paths.filter((_, imageIndex) => imageIndex !== index),
      imageUrl: "",
    });
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (getProductImages(product).length + files.length > 6) {
      notify("Cada produto pode ter até 6 fotos.", "warning");
      return;
    }
    if (
      files.some(
        (file) =>
          !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024,
      )
    ) {
      notify("Escolha imagens de até 10 MB cada.", "warning");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      notify("Entre com a conta administradora para enviar fotos.", "error");
      return;
    }

    setUploadingImages(true);
    onImageUploadStateChange(true);
    const uploaded: { path: string; url: string }[] = [];
    try {
      const webpFiles: File[] = [];
      for (const file of files) webpFiles.push(await convertToWebp(file));
      if (webpFiles.some((file) => file.size > 10 * 1024 * 1024)) {
        throw new Error("webp-file-too-large");
      }

      for (const file of webpFiles) {
        const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
        const path = `products/${user.uid}/${crypto.randomUUID()}-${fileName}`;
        const target = storageRef(storage, path);
        await uploadBytes(target, file, { contentType: "image/webp" });
        uploadedImagePaths.current.add(path);
        const url = await getDownloadURL(target);
        if (!mounted.current) {
          uploadedImagePaths.current.delete(path);
          await deleteObject(target).catch(() => {});
          return;
        }
        uploaded.push({ path, url });
      }
      setProduct((current) => ({
        ...current,
        imageUrls: [
          ...getProductImages(current),
          ...uploaded.map(({ url }) => url),
        ],
        imagePaths: [
          ...(current.imagePaths || getProductImages(current).map(() => "")),
          ...uploaded.map(({ path }) => path),
        ],
        imageUrl: "",
      }));
      notify(
        "Fotos convertidas para WebP e carregadas. Salve o produto para confirmar as alterações.",
        "success",
      );
    } catch (cause) {
      await Promise.allSettled(
        uploaded.map(async ({ path }) => {
          uploadedImagePaths.current.delete(path);
          await deleteObject(storageRef(storage, path));
        }),
      );
      if (mounted.current)
        notify(
          cause instanceof Error && cause.message === "webp-file-too-large"
            ? "Uma foto convertida passou de 10 MB. Escolha uma imagem menor."
            : cause instanceof Error &&
                cause.message === "webp-encoding-unsupported"
              ? "Este navegador não conseguiu converter a foto para WebP. Tente outro navegador."
              : "Não foi possível converter ou enviar as fotos. Confira o formato e o Firebase Storage.",
          "error",
        );
    } finally {
      if (mounted.current) {
        setUploadingImages(false);
        onImageUploadStateChange(false);
      }
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const wasEditing = Boolean(editing);
    if (
      !Number.isSafeInteger(product.priceCents) ||
      product.priceCents < 0 ||
      !Number.isSafeInteger(product.stock) ||
      product.stock < 0 ||
      !Number.isSafeInteger(
        product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      ) ||
      (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD) < 0
    ) {
      notify(
        "Não foi possível salvar. Confira os campos, sua permissão e a conexão com o banco.",
        "error",
      );
      setBusy(false);
      return;
    }

    try {
      const productToSave = {
        ...product,
        availability:
          product.availability === "available" ||
          product.availability === "soldout"
            ? availabilityFromStock(product.stock)
            : product.availability,
        imageUrls: product.imageUrls || getProductImages(product),
        imagePaths: product.imagePaths || [],
        imageUrl: product.imageUrls?.[0] || product.imageUrl || "",
        lowStockThreshold:
          product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      };
      if (editing) await updateDoc(doc(db, "products", editing), productToSave);
      else await addDoc(collection(db, "products"), productToSave);
      const removedPaths = Array.from(removedImagePaths.current);
      removedImagePaths.current.clear();
      await Promise.allSettled(
        removedPaths.map((path) => deleteObject(storageRef(storage, path))),
      );
      uploadedImagePaths.current.clear();
      setProduct(blankProduct);
      setEditing("");
      notify(
        wasEditing ? "Alterações salvas." : "Cadastro criado com sucesso.",
        "success",
      );
    } catch {
      notify(
        "Não foi possível salvar. Confira os campos, sua permissão e a conexão com o banco.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(item: Product) {
    try {
      await updateDoc(doc(db, "products", item.id), {
        status: item.status === "published" ? "draft" : "published",
      });
      notify("Visibilidade atualizada.", "success");
    } catch {
      notify("Não foi possível alterar a visibilidade.", "error");
    }
  }

  function editProduct(record: Product) {
    void discardUnsavedImages();
    removedImagePaths.current.clear();
    const { id, ...data } = record;
    const imageUrls = data.imageUrls?.length
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];
    setProduct({
      ...blankProduct,
      ...data,
      imageUrls,
      imagePaths: data.imagePaths?.length
        ? data.imagePaths
        : imageUrls.map(() => ""),
      lowStockThreshold: data.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    });
    setEditing(id);
  }

  async function removeProduct(id: string) {
    setDeleteBusy(true);
    try {
      const removedProduct = products.data.find((item) => item.id === id);
      await deleteDoc(doc(db, "products", id));
      if (removedProduct?.imagePaths?.length) {
        await Promise.allSettled(
          removedProduct.imagePaths
            .filter(Boolean)
            .map((path) => deleteObject(storageRef(storage, path))),
        );
      }
      notify("Cadastro excluído.", "success");
      setPendingDelete(null);
    } catch {
      notify("Não foi possível excluir este cadastro.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="admin-layout">
      <form key={`products-${editing}`} className="admin-form" onSubmit={save}>
        <h2>{editing ? "Editar peça" : "Novo cadastro"}</h2>
        <AdminProductFields
          product={product}
          setProduct={setProduct}
          lines={lines.data}
          categories={categories.data}
          uploadingImages={uploadingImages}
          onUploadImages={uploadImages}
          onRemoveImage={removeImage}
        />
        <button className="button" disabled={busy || uploadingImages}>
          {busy
            ? "Salvando…"
            : editing
              ? "Salvar alterações"
              : "Salvar cadastro"}{" "}
          <Plus size={17} />
        </button>
        {editing && (
          <button
            type="button"
            className="text-button"
            disabled={uploadingImages}
            onClick={() => {
              void discardUnsavedImages();
              removedImagePaths.current.clear();
              setEditing("");
              setProduct(blankProduct);
            }}
          >
            Cancelar edição
          </button>
        )}
      </form>
      <AdminRecordList
        tab="products"
        records={products}
        uploadingImages={uploadingImages}
        onEdit={(record) => editProduct(record as Product)}
        onToggleProduct={toggleProduct}
        onRequestDelete={(record) =>
          setPendingDelete({
            id: record.id,
            label: "name" in record ? record.name : record.title,
          })
        }
      />
      {pendingDelete && (
        <ConfirmationModal
          title="Excluir cadastro?"
          message={`Tem certeza que deseja excluir “${pendingDelete.label}”? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          busy={deleteBusy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void removeProduct(pendingDelete.id)}
        />
      )}
    </div>
  );
}
