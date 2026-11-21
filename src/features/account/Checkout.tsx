import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, PackageCheck } from "lucide-react";
import { BasketContext, SessionContext, useToast } from "../../app/contexts";
import {
  createSavedAddress,
  deleteSavedAddress,
  getBasketQuantityForVariant,
  getProductTotalPriceCents,
  parseBasketItemId,
  getStorefrontProduct,
  useRecords,
  useConversationQuotes,
  watchSavedAddresses,
  useCustomerProfile,
  type Product,
  type SavedAddress,
  type Taxonomy,
} from "../../data";
import {
  isNecklaceCategory,
  isProductAvailable,
} from "../../data/productAvailability";
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
  const [searchParams] = useSearchParams();
  const customQuoteId = searchParams.get("customQuote") || "";
  const conversationId = searchParams.get("conversation") || "";
  const customCheckoutRequested = Boolean(customQuoteId || conversationId);
  const customCheckoutValid = Boolean(customQuoteId && conversationId);
  const customChatParams = customCheckoutValid
    ? `&customQuote=${encodeURIComponent(customQuoteId)}&conversation=${encodeURIComponent(conversationId)}`
    : "";
  const customQuotes = useConversationQuotes(
    customCheckoutValid ? conversationId : undefined,
  );
  const customQuote = customQuotes.data.find(
    (quote) => quote.id === customQuoteId,
  );
  const products = useRecords<Product>("products");
  const categories = useRecords<Taxonomy>("categories");
  const collections = useRecords<Taxonomy>("collections");
  const colors = useRecords<Taxonomy>("colors");
  const visibleProducts = useMemo(
    () =>
      products.data
        .map((product) =>
          getStorefrontProduct(
            product,
            categories.data,
            collections.data,
            colors.data,
          ),
        )
        .filter((product): product is Product => Boolean(product)),
    [products.data, categories.data, collections.data, colors.data],
  );
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
        customCheckoutRequested ? customQuoteId : "",
      ),
    );
    setDraftOwnerUid(session.user.uid);
    setDraftReady(true);
  }, [session.user?.uid, customQuoteId, customCheckoutRequested]);

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
      localStorage.setItem(
        checkoutDraftStorageKey(
          session.user.uid,
          customCheckoutRequested ? customQuoteId : "",
        ),
        JSON.stringify(draft),
      );
    } catch {
      // O checkout continua funcionando mesmo se o navegador bloquear a sessão.
    }
  }, [
    draft,
    draftOwnerUid,
    draftReady,
    session.user,
    customQuoteId,
    customCheckoutRequested,
  ]);

  const basketLines: CheckoutLine[] = useMemo(
    () =>
      Object.entries(basket.items).map(([basketItemId, quantity]) => {
        const selection = parseBasketItemId(basketItemId);
        const product = visibleProducts.find(
          (item) => item.id === selection.productId,
        );
        const variant = product?.colorVariants?.find(
          (item) => item.colorId === selection.variantId,
        );
        const necklace = isNecklaceCategory(
          categories.data.find(
            (category) => category.id === product?.categoryId,
          ),
        );
        return {
          basketItemId,
          productId: selection.productId,
          variantId: selection.variantId,
          colorName: variant?.colorName,
          isNecklace: necklace,
          unitPriceCents: getProductTotalPriceCents(product, necklace),
          quantity,
          product,
        };
      }),
    [basket.items, visibleProducts, categories.data],
  );
  const customQuoteLine: CheckoutLine | undefined = customQuote
    ? {
        basketItemId: `custom:${customQuote.id}`,
        productId: "custom",
        variantId: customQuote.selectedColorId || "",
        colorName: customQuote.selectedColorId
          ? customQuote.colorNames?.[customQuote.selectedColorId]
          : undefined,
        isNecklace: isNecklaceCategory({
          name: customQuote.categoryName,
          slug: customQuote.categorySlug,
        }),
        unitPriceCents:
          customQuote.basePriceCents + (customQuote.chainAddonPriceCents || 0),
        quantity: 1,
        product: undefined,
        displayName: customQuote.title,
        categoryName: customQuote.categoryName,
        customDescription: customQuote.description,
        customQuoteId: customQuote.id,
      }
    : undefined;
  const lines: CheckoutLine[] = customCheckoutRequested
    ? customQuoteLine
      ? [customQuoteLine]
      : []
    : basketLines;
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const customQuoteIsValid = Boolean(
    customCheckoutValid &&
    customQuote &&
    customQuote.customerId === session.user?.uid &&
    customQuote.status === "accepted" &&
    Number.isSafeInteger(customQuote.basePriceCents) &&
    customQuote.basePriceCents > 0 &&
    (!customQuote.colorIds?.length ||
      customQuote.colorIds.includes(customQuote.selectedColorId || "")) &&
    (customQuote.chainAddonPriceCents === undefined ||
      Number.isSafeInteger(customQuote.chainAddonPriceCents)),
  );
  const cartIsValid = customCheckoutRequested
    ? customQuoteIsValid
    : lines.length > 0 &&
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
          quantity <= stock
        );
      });
  const checkoutItemsLoading = customCheckoutRequested
    ? customCheckoutValid && customQuotes.loading
    : products.loading ||
      categories.loading ||
      collections.loading ||
      colors.loading;
  const checkoutItemsError = customCheckoutRequested
    ? customCheckoutValid
      ? customQuotes.error
      : "Não foi possível abrir esta proposta personalizada. Volte ao chat e tente novamente."
    : products.error || categories.error || collections.error || colors.error;
  const cardTotalCents = Math.round(
    subtotalCents * (1 + DEMO_INSTALLMENT_RATE * Math.max(0, installments - 1)),
  );
  const paymentTotalCents =
    paymentMethod === "credit_card" ? cardTotalCents : subtotalCents;

  if (!session.ready) return <div className="page">Carregando sua conta…</div>;
  if (session.admin) return <Navigate to="/admin" replace />;
  if (!session.user) {
    const returnPath = customCheckoutRequested
      ? `/checkout?customQuote=${encodeURIComponent(customQuoteId)}&conversation=${encodeURIComponent(conversationId)}`
      : "/checkout";
    return (
      <div className="page narrow">
        <div className="eyebrow">FINALIZE SUA ESCOLHA</div>
        <h1>Entre para continuar</h1>
        <p className="lead">
          Sua sacola ficará salva enquanto você entra ou cria uma conta.
        </p>
        <Link
          className="button"
          to={`/conta?returnTo=${encodeURIComponent(returnPath)}`}
        >
          Entrar ou criar conta <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  if (customCheckoutRequested && !customCheckoutValid) {
    return (
      <div className="page narrow">
        <h1>Proposta incompleta</h1>
        <p className="lead">
          Volte ao chat e abra o checkout pela proposta personalizada.
        </p>
        <Link className="button" to="/chat">
          Voltar ao chat <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  if (customCheckoutRequested && customQuotes.loading) {
    return <div className="page">Carregando sua proposta…</div>;
  }
  if (customCheckoutRequested && customQuotes.error) {
    return (
      <div className="page narrow">
        <h1>Não foi possível abrir a proposta</h1>
        <p className="lead">Volte ao chat e tente novamente.</p>
        <Link className="button" to="/chat">
          Voltar ao chat <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  if (
    customCheckoutRequested &&
    (!customQuote || customQuote.customerId !== session.user.uid)
  ) {
    return (
      <div className="page narrow">
        <h1>Proposta não encontrada</h1>
        <p className="lead">Confira a proposta no chat com a artesã.</p>
        <Link className="button" to="/chat">
          Voltar ao chat <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  if (customQuote?.status === "ordered")
    return <Navigate to="/pedidos" replace />;
  if (customCheckoutRequested && customQuote?.status !== "accepted") {
    return (
      <div className="page narrow">
        <h1>Responda à proposta no chat</h1>
        <p className="lead">
          Aceite a proposta e escolha as opções antes de seguir para o checkout.
        </p>
        <Link
          className="button"
          to={`/chat?${new URLSearchParams({ customQuote: customQuoteId, conversation: conversationId })}`}
        >
          Abrir proposta no chat <ArrowRight size={18} />
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
      localStorage.setItem(
        checkoutDraftStorageKey(
          session.user.uid,
          customCheckoutRequested ? customQuoteId : "",
        ),
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
        items: customCheckoutRequested
          ? []
          : lines.map(({ productId, variantId, quantity }) => ({
              productId,
              ...(variantId ? { variantId } : {}),
              quantity,
            })),
        ...(customCheckoutRequested ? { customQuoteId, conversationId } : {}),
        deliveryMethod: draft.deliveryMethod,
        pickupAgreed: draft.pickupAgreed,
        ...(draft.deliveryMethod === "sedex" ? { address: draft.address } : {}),
        paymentMethod,
        installments: paymentMethod === "credit_card" ? installments : 1,
        isGift: draft.isGift,
        ...(draft.isGift && draft.giftMessage.trim()
          ? { giftMessage: draft.giftMessage.trim() }
          : {}),
        paymentStatus: status,
        expectedTotalCents: paymentTotalCents,
      });
      try {
        localStorage.removeItem(
          checkoutDraftStorageKey(
            session.user.uid,
            customCheckoutRequested ? customQuoteId : "",
          ),
        );
        sessionStorage.removeItem(
          checkoutDraftStorageKey(
            session.user.uid,
            customCheckoutRequested ? customQuoteId : "",
          ),
        );
      } catch {
        // O pedido já foi gravado no Firestore.
      }
      if (!customCheckoutRequested) basket.clear();
      navigate("/pedidos", {
        state: {
          checkoutDemo: status,
          orderNumber: order.orderNumber,
          stockReserved: !customCheckoutRequested,
          customOrder: customCheckoutRequested,
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
      <h1>
        {customCheckoutRequested
          ? "Finalizar encomenda personalizada"
          : "Finalizar compra"}
      </h1>
      <div className="checkout-demo-banner" role="note">
        <strong>Checkout de demonstração</strong>
        <span>
          Nenhuma cobrança será feita. Não informe dados reais de cartão. O
          pedido fica gravado no Firebase.
          {customCheckoutRequested
            ? " A encomenda personalizada não altera o estoque do catálogo."
            : " As peças ficam reservadas no estoque até o cancelamento do pedido."}
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

      {checkoutItemsLoading && (
        <p role="status">
          {customCheckoutRequested
            ? "Carregando sua proposta…"
            : "Carregando as peças…"}
        </p>
      )}
      {checkoutItemsError && (
        <p className="notice" role="alert">
          {customCheckoutRequested
            ? checkoutItemsError
            : "Não foi possível carregar a sacola. Volte ao carrinho e tente novamente."}
        </p>
      )}
      {!checkoutItemsLoading && !checkoutItemsError && lines.length === 0 && (
        <div className="empty">
          <PackageCheck />
          <h2>
            {customCheckoutRequested
              ? "Não há uma proposta disponível para finalizar."
              : "Sua sacola está vazia."}
          </h2>
          <Link
            className="button"
            to={customCheckoutRequested ? "/chat" : "/loja"}
          >
            {customCheckoutRequested ? "Voltar ao chat" : "Conhecer as peças"}{" "}
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
      {!checkoutItemsLoading && !checkoutItemsError && lines.length > 0 && (
        <div className="checkout-layout">
          <div className="checkout-main">
            {!cartIsValid && (
              <p className="notice" role="alert">
                {customCheckoutRequested
                  ? "A proposta mudou ou uma das opções não está válida. Volte ao chat para conferir."
                  : "Uma ou mais peças não estão mais disponíveis na quantidade escolhida. Ajuste a sacola antes de continuar."}
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
                customCheckoutParams={customChatParams}
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
