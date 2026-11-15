export const availability: Record<string, string> = {
  available: "Disponível",
  soldout: "Esgotado",
  prelaunch: "Em breve",
  "made-to-order": "Sob encomenda",
};

export const POLICY_TYPES = [
  { id: "delivery", label: "Entrega e frete" },
  { id: "reshipment", label: "Reenvio" },
  { id: "cancellation", label: "Cancelamento" },
  { id: "returns", label: "Trocas e devoluções" },
  { id: "payment", label: "Pagamento" },
  { id: "privacy", label: "Privacidade" },
  { id: "general", label: "Geral" },
];

export const DEFAULT_LOW_STOCK_THRESHOLD = 2;

export const orderStatusLabels: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  confirmed: "Pagamento confirmado",
  preparing: "Em preparação",
  in_transit: "A caminho",
  completed: "Concluído",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const orderStatusOptions = Object.keys(orderStatusLabels);
