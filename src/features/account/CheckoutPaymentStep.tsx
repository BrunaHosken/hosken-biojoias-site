import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard } from "lucide-react";
import type { CheckoutPaymentMethod } from "./checkoutModel";

type CheckoutPaymentStepProps = {
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  installments: number;
  setInstallments: (count: number) => void;
  busy: boolean;
  cartIsValid: boolean;
  onFinish: (status: "simulated_paid" | "pending") => void;
  onBack: () => void;
};

function PixIllustration() {
  const pattern = [
    "111101001111",
    "100101101001",
    "101101001101",
    "100101101001",
    "111101001111",
    "001011110100",
    "110100101011",
    "011011001100",
    "111101011001",
    "100101110110",
    "101101001011",
    "111101101101",
  ];
  return (
    <div
      className="pix-demo"
      role="img"
      aria-label="Imagem ilustrativa de QR Code Pix, sem valor para pagamento"
    >
      <div className="pix-demo-grid" aria-hidden="true">
        {pattern.flatMap((row, rowIndex) =>
          [...row].map((cell, columnIndex) => (
            <span
              className={cell === "1" ? "is-dark" : ""}
              key={`${rowIndex}-${columnIndex}`}
            />
          )),
        )}
      </div>
      <span className="pix-demo-stamp">
        PIX
        <br />
        TESTE
      </span>
      <strong>IMAGEM ILUSTRATIVA</strong>
    </div>
  );
}

export function CheckoutPaymentStep({
  paymentMethod,
  setPaymentMethod,
  installments,
  setInstallments,
  busy,
  cartIsValid,
  onFinish,
  onBack,
}: CheckoutPaymentStepProps) {
  return (
    <section className="checkout-card">
      <div className="checkout-section-heading">
        <span className="eyebrow">ETAPA 2</span>
        <h2>Escolha como pagar</h2>
      </div>
      <div className="checkout-payment-options">
        <button
          type="button"
          aria-pressed={paymentMethod === "credit_card"}
          className={paymentMethod === "credit_card" ? "is-selected" : ""}
          onClick={() => setPaymentMethod("credit_card")}
        >
          <CreditCard size={18} /> Cartão de crédito
        </button>
        <button
          type="button"
          aria-pressed={paymentMethod === "pix"}
          className={paymentMethod === "pix" ? "is-selected" : ""}
          onClick={() => setPaymentMethod("pix")}
        >
          <span className="pix-symbol">◇</span> Pix
        </button>
      </div>
      {paymentMethod === "credit_card" ? (
        <>
          <p className="checkout-payment-warning">
            Demonstração visual. Não digite dados reais: o cartão não será
            validado nem cobrado, e os campos abaixo não são enviados nem
            salvos.
          </p>
          <form
            className="checkout-card-fields"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              onFinish("simulated_paid");
            }}
          >
            <label>
              Nome impresso no cartão
              <input
                required
                autoComplete="off"
                maxLength={100}
                placeholder="Nome como aparece no cartão"
              />
            </label>
            <label>
              Número do cartão
              <input
                required
                autoComplete="off"
                inputMode="numeric"
                maxLength={23}
                placeholder="0000 0000 0000 0000"
              />
            </label>
            <div className="checkout-field-pair">
              <label>
                Validade
                <input
                  required
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="MM/AA"
                />
              </label>
              <label>
                Código de segurança
                <input
                  required
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="CVV"
                />
              </label>
            </div>
            <label>
              Parcelas
              <select
                value={installments}
                onChange={(event) =>
                  setInstallments(Number(event.target.value))
                }
              >
                {Array.from({ length: 6 }, (_, index) => index + 1).map(
                  (count) => (
                    <option key={count} value={count}>
                      {count}x{" "}
                      {count === 1 ? "sem juros" : "com juros ilustrativos"}
                    </option>
                  ),
                )}
              </select>
            </label>
            <p className="checkout-interest-note">
              Para esta simulação, usamos juros ilustrativos de 2% por parcela
              adicional. A taxa real dependerá do meio de pagamento escolhido.
            </p>
            <button className="button" disabled={busy || !cartIsValid}>
              {busy ? "Registrando…" : "Simular aprovação do cartão"}{" "}
              <ArrowRight size={18} />
            </button>
          </form>
        </>
      ) : (
        <div className="checkout-pix-content">
          <PixIllustration />
          <div>
            <h3>Pix ilustrativo</h3>
            <p>
              Esta imagem não é um QR Code válido e não gera cobrança. Use o
              botão abaixo só para testar o fluxo.
            </p>
            <button
              className="button"
              type="button"
              disabled={busy || !cartIsValid}
              onClick={() => onFinish("simulated_paid")}
            >
              Simular Pix recebido <Check size={18} />
            </button>
            <button
              className="text-button"
              type="button"
              disabled={busy || !cartIsValid}
              onClick={() => onFinish("pending")}
            >
              Criar pedido aguardando pagamento
            </button>
          </div>
        </div>
      )}
      {paymentMethod === "credit_card" && (
        <button
          className="text-button checkout-pending-action"
          type="button"
          disabled={busy || !cartIsValid}
          onClick={() => onFinish("pending")}
        >
          Criar pedido aguardando pagamento
        </button>
      )}
      <div className="checkout-actions checkout-payment-actions">
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Voltar para entrega
        </button>
      </div>
    </section>
  );
}
