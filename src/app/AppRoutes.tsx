import { Link, Route, Routes } from "react-router-dom";
import { Home } from "../features/storefront/pages/Home";
import { Shop } from "../features/storefront/pages/Shop";
import { ProductPage } from "../features/storefront/pages/ProductPage";
import { ContentPage } from "../features/storefront/pages/ContentPage";
import { PoliciesPage } from "../features/storefront/pages/PoliciesPage";
import { About } from "../features/storefront/pages/About";
import { Contact } from "../features/storefront/Contact";
import { Account } from "../features/account/Account";
import { OrdersPage } from "../features/account/Orders";
import { Cart } from "../features/account/Cart";
import { CustomerChat } from "../features/chat/CustomerChat";
import { Admin } from "../features/admin/AdminPanel";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/loja" element={<Shop />} />
      <Route path="/produto/:id" element={<ProductPage />} />
      <Route
        path="/novidades"
        element={
          <ContentPage
            name="news"
            title="Novidades do ateliê"
            subtitle="Novas ideias, flores e caminhos."
          />
        }
      />
      <Route
        path="/eventos"
        element={
          <ContentPage
            name="events"
            title="Vamos nos encontrar?"
            subtitle="Acompanhe os próximos encontros e feiras."
          />
        }
      />
      <Route
        path="/onde-encontrar"
        element={
          <ContentPage
            name="partnerStores"
            title="Hosken Biojoias perto de você"
            subtitle="Conheça nossos pontos de encontro e lojas parceiras."
          />
        }
      />
      <Route path="/sobre" element={<About />} />
      <Route path="/contato" element={<Contact />} />
      <Route path="/politicas" element={<PoliciesPage />} />
      <Route path="/conta" element={<Account />} />
      <Route path="/pedidos" element={<OrdersPage />} />
      <Route path="/chat" element={<CustomerChat />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/carrinho" element={<Cart />} />
      <Route
        path="*"
        element={
          <div className="page">
            <h1>Página não encontrada</h1>
            <Link to="/loja">Voltar à loja</Link>
          </div>
        }
      />
    </Routes>
  );
}
