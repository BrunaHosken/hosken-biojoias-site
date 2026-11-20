import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
} from "firebase/storage";
import { Plus } from "lucide-react";
import { useToast } from "../../app/contexts";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../../app/constants";
import { ConfirmationModal } from "../../components/Feedback";
import {
  useRecords,
  type Product,
  type ProductShippingData,
  type Taxonomy,
} from "../../data";
import { auth, db, storage } from "../../firebase";
import { getProductImages } from "../storefront/productImages";
import { availabilityFromStock } from "../../data/productAvailability";
import { convertToWebp } from "../../utils/convertToWebp";
import { uploadFile } from "../../utils/uploadFile";
import { AdminRecordList } from "./AdminRecordList";
import { AdminProductFields } from "./ProductFields";
import { blankProduct } from "./productModel";

export function AdminProductManager() {
  const products = useRecords<Product>("products", true);
  const categories = useRecords<Taxonomy>("categories", true);
  const lines = useRecords<Taxonomy>("collections", true);
  const [editing, setEditing] = useState("");
  const [product, setProduct] = useState(blankProduct);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingLoadError, setShippingLoadError] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const uploadedImagePaths = useRef(new Set<string>());
  const removedImagePaths = useRef(new Set<string>());
  const mounted = useRef(true);
  const shippingLoadVersion = useRef(0);
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
        await uploadFile(target, file, { contentType: "image/webp" });
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
            : cause instanceof Error && cause.message === "file-upload-timeout"
              ? "O envio demorou demais e foi cancelado. Confira sua conexão e tente novamente."
            : cause instanceof Error &&
                cause.message === "webp-encoding-unsupported"
              ? "Este navegador não conseguiu converter a foto para WebP. Tente outro navegador."
              : "Não foi possível enviar as fotos. Você pode continuar usando o painel; confira sua conexão e o Firebase Storage.",
          "error",
        );
    } finally {
      if (mounted.current) {
        setUploadingImages(false);
      }
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingShipping || shippingLoadError) return;
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
    const requiredPackageValues = [
      product.packageLengthCm,
      product.packageWidthCm,
      product.packageHeightCm,
      product.packageWeightGrams,
    ];
    if (
      requiredPackageValues.some(
        (value) =>
          typeof value !== "number" || !Number.isFinite(value) || value <= 0,
      ) ||
      (product.pieceWeightGrams !== undefined &&
        (!Number.isFinite(product.pieceWeightGrams) ||
          product.pieceWeightGrams <= 0))
    ) {
      notify(
        "Preencha as dimensões e o peso da embalagem. O peso da joia é opcional.",
        "warning",
      );
      setBusy(false);
      return;
    }

    try {
      const {
        packageLengthCm,
        packageWidthCm,
        packageHeightCm,
        packageWeightGrams,
        pieceWeightGrams,
        ...productDetails
      } = product;
      const productToSave = {
        ...productDetails,
        availability:
          productDetails.availability === "available" ||
          productDetails.availability === "soldout"
            ? availabilityFromStock(productDetails.stock)
            : productDetails.availability,
        imageUrls: product.imageUrls || getProductImages(product),
        imagePaths: product.imagePaths || [],
        imageUrl: product.imageUrls?.[0] || product.imageUrl || "",
        lowStockThreshold:
          product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      };
      const shippingToSave: ProductShippingData = {
        packageLengthCm: packageLengthCm!,
        packageWidthCm: packageWidthCm!,
        packageHeightCm: packageHeightCm!,
        packageWeightGrams: packageWeightGrams!,
        ...(pieceWeightGrams === undefined ? {} : { pieceWeightGrams }),
      };
      const productRef = editing
        ? doc(db, "products", editing)
        : doc(collection(db, "products"));
      const batch = writeBatch(db);
      batch.set(productRef, productToSave);
      batch.set(
        doc(db, "productShipping", productRef.id),
        shippingToSave,
      );
      await batch.commit();
      const removedPaths = Array.from(removedImagePaths.current);
      removedImagePaths.current.clear();
      await Promise.allSettled(
        removedPaths.map((path) => deleteObject(storageRef(storage, path))),
      );
      uploadedImagePaths.current.clear();
      setProduct(blankProduct);
      setEditing("");
      setLoadingShipping(false);
      setShippingLoadError(false);
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

  async function editProduct(record: Product) {
    const requestVersion = ++shippingLoadVersion.current;
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
    setLoadingShipping(true);
    setShippingLoadError(false);
    try {
      const shippingSnapshot = await getDoc(
        doc(db, "productShipping", id),
      );
      if (
        !mounted.current ||
        requestVersion !== shippingLoadVersion.current
      )
        return;
      const shipping = shippingSnapshot.exists()
        ? (shippingSnapshot.data() as ProductShippingData)
        : undefined;
      setProduct((current) => ({
        ...current,
        packageLengthCm: shipping?.packageLengthCm,
        packageWidthCm: shipping?.packageWidthCm,
        packageHeightCm: shipping?.packageHeightCm,
        packageWeightGrams: shipping?.packageWeightGrams,
        pieceWeightGrams: shipping?.pieceWeightGrams,
      }));
    } catch {
      if (mounted.current && requestVersion === shippingLoadVersion.current) {
        setShippingLoadError(true);
        notify(
          "Não foi possível carregar os dados internos de frete deste produto.",
          "error",
        );
      }
    } finally {
      if (mounted.current && requestVersion === shippingLoadVersion.current)
        setLoadingShipping(false);
    }
  }

  async function removeProduct(id: string) {
    setDeleteBusy(true);
    try {
      const removedProduct = products.data.find((item) => item.id === id);
      const batch = writeBatch(db);
      batch.delete(doc(db, "products", id));
      batch.delete(doc(db, "productShipping", id));
      await batch.commit();
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
        <fieldset
          className="admin-product-fieldset"
          disabled={busy || uploadingImages || loadingShipping}
        >
          <AdminProductFields
            product={product}
            setProduct={setProduct}
            lines={lines.data}
            categories={categories.data}
            uploadingImages={uploadingImages}
            onUploadImages={uploadImages}
            onRemoveImage={removeImage}
          />
          <button className="button" disabled={shippingLoadError}>
            {busy
              ? "Salvando…"
              : loadingShipping
                ? "Carregando dados…"
                : editing
                  ? "Salvar alterações"
                  : "Salvar cadastro"}{" "}
            <Plus size={17} />
          </button>
        </fieldset>
        {editing && (
          <button
            type="button"
            className="text-button"
            disabled={busy || uploadingImages}
            onClick={() => {
              shippingLoadVersion.current += 1;
              void discardUnsavedImages();
              removedImagePaths.current.clear();
              setEditing("");
              setProduct(blankProduct);
              setLoadingShipping(false);
              setShippingLoadError(false);
            }}
          >
            Cancelar edição
          </button>
        )}
        {loadingShipping && editing && (
          <p className="field-hint" role="status">
            Carregando dados internos de frete…
          </p>
        )}
        {shippingLoadError && (
          <p className="field-hint" role="alert">
            Cancele a edição e tente abrir o produto novamente.
          </p>
        )}
      </form>
      <AdminRecordList
        tab="products"
        records={products}
        uploadingImages={uploadingImages}
        onEdit={(record) => void editProduct(record as Product)}
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
