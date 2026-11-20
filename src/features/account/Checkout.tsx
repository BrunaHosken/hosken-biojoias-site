import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, PackageCheck } from "lucide-react";
import { BasketContext, SessionContext, useToast } from "../../app/contexts";
import {
  createSavedAddress,
  deleteSavedAddress,
  getBasketQuantityForVariant,
  parseBasketItemId,
  useRecords,
  watchSavedAddresses,
  useCustomerProfile,
  type Product,
  type SavedAddress,
} from "../../data";
import { isProductAvailable } from "../../data/productAvailability";
import { getProductStock } from "../../data/productAvailability";
import { createDemoOrder, getCheckoutErrorMessage } from "../../data/checkout";
import { CheckoutDeliveryStep } from "./CheckoutDeliveryStep";
import { CheckoutPaymentStep } from "./CheckoutPaymentStep";
import { CheckoutSummary } from "./CheckoutSummary";
import {
  checkoutDraftStorageKey,
  DEMO_INSTALLMENT_RATE,
  emptyCheckoutDraft,
  loadCheckoutDraft,
  type CheckoutAddress,
  type CheckoutContact,
  type CheckoutDraft,
  type CheckoutLine,
  type CheckoutPaymentMethod,
} from "./checkoutModel";
import { formatBrazilianMobile } from "./checkoutModel";

export function Checkout() {
  const session = useContext(SessionContext);
  const basket = useContext(BasketContext);
  const notify = useToast();
  const navigate = useNavigate();
  const products = useRecords<Product>("products");
  const customerProfile = useCustomerProfile(session.user?.uid);
  const [draft, setDraft] = useState<CheckoutDraft>(() => emptyCheckoutDraft());
  const [draftReady, setDraftReady] = useState(false);
  const [draftOwnerUid, setDraftOwnerUid] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("credit_card");
  const [installments, setInstallments] = useState(1);
  const [busy, setBusy] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false);
  const [savedAddressesError, setSavedAddressesError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!session.user) return;
    setDraft(
      loadCheckoutDraft(
        session.user.uid,
        session.user.displayName || "",
        session.user.email || "",
      ),
    );
    setDraftOwnerUid(session.user.uid);
    setDraftReady(true);
  }, [session.user?.uid]);

  useEffect(() => {
    if (!session.user || customerProfile.loading) return;
    const savedPhone = formatBrazilianMobile(
      customerProfile.profile.phone || "",
    );
    if (!savedPhone) return;
    setDraft((current) =>
      current.contact.phone
        ? current
        : {
            ...current,
            contact: { ...current.contact, phone: savedPhone },
          },
    );
  }, [
    session.user?.uid,
    customerProfile.loading,
    customerProfile.profile.phone,
  ]);

  useEffect(() => {
    setSavedAddresses([]);
    setSavedAddressesError("");
    setSelectedAddressId("");
    setSaveAddressForFuture(false);
    setAddressLabel("");
    if (!session.user?.uid) {
      setSavedAddressesLoading(false);
      return;
    }
    setSavedAddressesLoading(true);
    return watchSavedAddresses(
      session.user.uid,
      (addresses) => {
        setSavedAddresses(addresses);
        setSavedAddressesError("");
        setSavedAddressesLoading(false);
      },
      () => {
        setSavedAddressesError(
          "Não foi possível carregar seus endereços salvos.",
        );
        setSavedAddressesLoading(false);
      },
    );
  }, [session.user?.uid]);

  useEffect(() => {
    if (!session.user || !draftReady || draftOwnerUid !== session.user.uid)
      return;
    try {
      sessionStorage.setItem(
        checkoutDraftStorageKey(session.user.uid),
        JSON.stringify(draft),
      );
    } catch {
      // O checkout continua funcionando mesmo se o navegador bloquear a sessão.
    }
  }, [draft, draftOwnerUid, draftReady, session.user]);

  const lines: CheckoutLine[] = useMemo(
    () =>
      Object.entries(basket.items).map(([basketItemId, quantity]) => {
        const selection = parseBasketItemId(basketItemId);
        const product = products.data.find(
          (item) => item.id === selection.productId,
        );
        const variant = product?.colorVariants?.find(
          (item) => item.colorId === selection.variantId,
        );
        return {
          basketItemId,
          productId: selection.productId,
          variantId: selection.variantId,
          colorName: variant?.colorName,
          withChain: selection.withChain,
          unitPriceCents:
            selection.withChain && product?.withChainPriceCents !== undefined
              ? product.withChainPriceCents
              : (product?.priceCents ?? 0),
          quantity,
          product,
        };
      }),
    [basket.items, products.data],
  );
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const cartIsValid =
    lines.length > 0 &&
    lines.every((line) => {
      const product = line.product;
      if (!product) return false;
      const variant = product.colorVariants?.find(
        (item) => item.colorId === line.variantId,
      );
      const variantRequired = Boolean(product.colorVariants?.length);
      const stock = variantRequired
        ? (variant?.stock ?? -1)
        : line.variantId
          ? -1
          : getProductStock(product);
      const quantity = getBasketQuantityForVariant(
        basket.items,
        line.productId,
        line.variantId,
      );
      return (
        isProductAvailable(product) &&
        (!variantRequired || Boolean(variant)) &&
        (!line.withChain || product.withChainPriceCents !== undefined) &&
        quantity <= stock
      );
    });
  const cardTotalCents = Math.round(
    subtotalCents * (1 + DEMO_INSTALLMENT_RATE * Math.max(0, installments - 1)),
  );
  const paymentTotalCents =
    paymentMethod === "pix" ? subtotalCents : cardTotalCents;

  if (!session.ready) return <div className="page">Carregando sua conta…</div>;
  if (session.admin) return <Navigate to="/admin" replace />;
  if (!session.user) {
    return (
      <div className="page narrow">
        <div className="eyebrow">FINALIZE SUA ESCOLHA</div>
        <h1>Entre para continuar</h1>
        <p className="lead">
          Sua sacola ficará salva enquanto você entra ou cria uma conta.
        </p>
        <Link
          className="button"
          to={`/conta?returnTo=${encodeURIComponent("/checkout")}`}
        >
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  function updateContact(field: keyof CheckoutContact, value: string) {
    setDraft((current) => ({
      ...current,
      contact: { ...current.contact, [field]: value },
    }));
  }

  function updateAddress(field: keyof CheckoutAddress, value: string) {
    setSelectedAddressId("");
    setDraft((current) => ({
      ...current,
      address: { ...current.address, [field]: value },
    }));
  }

  function selectSavedAddress(addressId: string) {
    setSelectedAddressId(addressId);
    setSaveAddressForFuture(false);
    setAddressLabel("");
    const savedAddress = savedAddresses.find(
      (address) => address.id === addressId,
    );
    setDraft((current) => ({
      ...current,
      address: savedAddress
        ? {
            postalCode: savedAddress.postalCode,
            street: savedAddress.street,
            number: savedAddress.number,
            complement: savedAddress.complement,
            neighborhood: savedAddress.neighborhood,
            city: savedAddress.city,
            state: savedAddress.state,
          }
        : emptyCheckoutDraft().address,
    }));
  }

  async function deleteSelectedAddress() {
    if (!session.user || !selectedAddressId) return;
    const selected = savedAddresses.find(
      (address) => address.id === selectedAddressId,
    );
    if (!selected) return;
    if (!window.confirm(`Excluir o endereço salvo “${selected.label}”?`))
      return;
    try {
      await deleteSavedAddress(session.user.uid, selectedAddressId);
      selectSavedAddress("");
      notify("Endereço removido da sua conta.", "success");
    } catch {
      notify(
        "Não foi possível excluir este endereço. Tente novamente.",
        "error",
      );
    }
  }

  function sameAddress(first: CheckoutAddress, second: CheckoutAddress) {
    const fields: (keyof CheckoutAddress)[] = [
      "postalCode",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
    ];
    return fields.every(
      (key) =>
        first[key].trim().toLocaleLowerCase("pt-BR") ===
        second[key].trim().toLocaleLowerCase("pt-BR"),
    );
  }

  async function saveCurrentAddress(): Promise<boolean> {
    if (selectedAddressId) return true;
    if (!session.user || savingAddress) return false;
    if (
      !/^\d{5}-?\d{3}$/.test(draft.address.postalCode) ||
      !draft.address.street.trim() ||
      !draft.address.number.trim() ||
      !draft.address.neighborhood.trim() ||
      !draft.address.city.trim() ||
      !/^[A-Z]{2}$/.test(draft.address.state) ||
      !addressLabel.trim()
    ) {
      notify(
        "Preencha o endereço e dê um nome para ele antes de salvar.",
        "warning",
      );
      return false;
    }

    setSavingAddress(true);
    try {
      const matchingAddress = savedAddresses.find((address) =>
        sameAddress(address, draft.address),
      );
      if (matchingAddress) {
        setSelectedAddressId(matchingAddress.id);
        setSaveAddressForFuture(false);
        setAddressLabel("");
        notify("Esse endereço já estava salvo na sua conta.", "info");
        return true;
      }

      const savedAddress = await createSavedAddress(
        session.user.uid,
        addressLabel,
        draft.address,
      );
      setSavedAddresses((current) =>
        [...current, savedAddress].sort((a, b) =>
          a.label.localeCompare(b.label, "pt-BR"),
        ),
      );
      setSelectedAddressId(savedAddress.id);
      setSaveAddressForFuture(false);
      setAddressLabel("");
      notify("Endereço salvo para as próximas compras.", "success");
      return true;
    } catch (cause) {
      if (import.meta.env.DEV)
        console.error("Saved address write failed", cause);
      notify("Não foi possível salvar o endereço. Tente novamente.", "error");
      return false;
    } finally {
      setSavingAddress(false);
    }
  }

  async function continueToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartIsValid) {
      notify("Confira a disponibilidade das peças na sua sacola.", "warning");
      return;
    }
    if (draft.deliveryMethod === "pickup" && !draft.pickupAgreed) {
      notify("Combine a retirada pelo chat e marque a confirmação.", "warning");
      return;
    }
    if (
      draft.deliveryMethod === "sedex" &&
      saveAddressForFuture &&
      !selectedAddressId &&
      session.user
    ) {
      const saved = await saveCurrentAddress();
      if (!saved) return;
    }
    setDraft((current) => ({ ...current, step: 2 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finishDemoOrder(status: "simulated_paid" | "pending") {
    if (!session.user || !cartIsValid || busy) return;
    setBusy(true);
    const orderId = draft.orderId || crypto.randomUUID();
    const currentDraft = { ...draft, orderId };
    try {
      sessionStorage.setItem(
        checkoutDraftStorageKey(session.user.uid),
        JSON.stringify(currentDraft),
      );
    } catch {
      // A operação segue com a chave de repetição mantida em memória.
    }
    try {
      const order = await createDemoOrder({
        orderId,
        customerName: draft.contact.name.trim(),
        customerEmail: draft.contact.email.trim(),
        customerPhone: draft.contact.phone.trim(),
        items: lines.map(({ productId, variantId, withChain, quantity }) => ({
          productId,
          ...(variantId ? { variantId } : {}),
          withChain,
          quantity,
        })),
        deliveryMethod: draft.deliveryMethod,
        pickupAgreed: draft.pickupAgreed,
        ...(draft.deliveryMethod === "sedex" ? { address: draft.address } : {}),
        paymentMethod,
        installments: paymentMethod === "credit_card" ? installments : 1,
        paymentStatus: status,
        expectedTotalCents: paymentTotalCents,
      });
      try {
        sessionStorage.removeItem(checkoutDraftStorageKey(session.user.uid));
      } catch {
        // O pedido já foi gravado no Firestore.
      }
      basket.clear();
      navigate("/pedidos", {
        state: {
          checkoutDemo: status,
          orderNumber: order.orderNumber,
          stockReserved: true,
        },
      });
    } catch (error) {
      setDraft((current) => ({ ...current, orderId }));
      notify(getCheckoutErrorMessage(error), "error");
      setBusy(false);
    }
  }

  return (
    <div className="page checkout-page">
      <div className="eyebrow">UMA COMPRA FEITA COM CARINHO</div>
      <h1>Finalizar compra</h1>
      <div className="checkout-demo-banner" role="note">
        <strong>Checkout de demonstração</strong>
        <span>
          Nenhuma cobrança será feita. Não informe dados reais de cartão. O
          pedido e a reserva de estoque são gravados no Firebase. A reserva só é
          liberada se o pedido for cancelado.
        </span>
      </div>

      <ol className="checkout-steps" aria-label="Etapas da compra">
        <li className={draft.step === 1 ? "is-active" : "is-done"}>
          <span>{draft.step > 1 ? <Check size={16} /> : "1"}</span>
          <div>
            <strong>Entrega</strong>
            <small>Contato e recebimento</small>
          </div>
        </li>
        <li className={draft.step === 2 ? "is-active" : ""}>
          <span>2</span>
          <div>
            <strong>Pagamento</strong>
            <small>Cartão ou Pix ilustrativo</small>
          </div>
        </li>
      </ol>

      {products.loading && <p role="status">Carregando as peças…</p>}
      {products.error && (
        <p className="notice" role="alert">
          Não foi possível carregar a sacola. Volte ao carrinho e tente
          novamente.
        </p>
      )}
      {!products.loading && !products.error && lines.length === 0 && (
        <div className="empty">
          <PackageCheck />
          <h2>Sua sacola está vazia.</h2>
          <Link className="button" to="/loja">
            Conhecer as peças <ArrowRight size={18} />
          </Link>
        </div>
      )}
      {!products.loading && !products.error && lines.length > 0 && (
        <div className="checkout-layout">
          <div className="checkout-main">
            {!cartIsValid && (
              <p className="notice" role="alert">
                Uma ou mais peças não estão mais disponíveis na quantidade
                escolhida. Ajuste a sacola antes de continuar.
              </p>
            )}
            {draft.step === 1 ? (
              <CheckoutDeliveryStep
                draft={draft}
                setDraft={setDraft}
                cartIsValid={cartIsValid}
                savedAddresses={savedAddresses}
                savedAddressesLoading={savedAddressesLoading}
                savedAddressesError={savedAddressesError}
                selectedAddressId={selectedAddressId}
                saveAddressForFuture={saveAddressForFuture}
                addressLabel={addressLabel}
                savingAddress={savingAddress}
                onUpdateContact={updateContact}
                onUpdateAddress={updateAddress}
                onSelectSavedAddress={selectSavedAddress}
                onSaveAddressForFutureChange={setSaveAddressForFuture}
                onAddressLabelChange={setAddressLabel}
                onSaveAddress={() => void saveCurrentAddress()}
                onDeleteSavedAddress={deleteSelectedAddress}
                onContinue={continueToPayment}
              />
            ) : (
              <CheckoutPaymentStep
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                installments={installments}
                setInstallments={setInstallments}
                busy={busy}
                cartIsValid={cartIsValid}
                onFinish={finishDemoOrder}
                onBack={() => setDraft((current) => ({ ...current, step: 1 }))}
              />
            )}
          </div>
          <CheckoutSummary
            draft={draft}
            lines={lines}
            subtotalCents={subtotalCents}
            paymentMethod={paymentMethod}
            installments={installments}
            cardTotalCents={cardTotalCents}
            paymentTotalCents={paymentTotalCents}
          />
        </div>
      )}
    </div>
  );
}
