import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  ExternalLink,
  FileText,
  IceCreamBowl,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  ReceiptText,
  Truck,
  Users
} from "lucide-react";
import { supabase, supabaseEnabled } from "./supabaseClient";
import "./styles.css";

const modules = [
  { id: "dashboard", label: "Inicio", title: "Resumen general", icon: LayoutDashboard },
  { id: "clientes", label: "Clientes", title: "Clientes", icon: Users },
  { id: "productos", label: "Productos", title: "Productos", icon: IceCreamBowl },
  { id: "pedidos", label: "Pedidos", title: "Pedidos", icon: ClipboardList },
  { id: "inventario", label: "Inventario", title: "Inventario", icon: Boxes },
  { id: "entregas", label: "Entregas", title: "Entregas", icon: Truck },
  { id: "facturacion", label: "Facturacion", title: "Facturacion", icon: ReceiptText },
  { id: "contabilidad", label: "Contabilidad", title: "Contabilidad general", icon: Calculator },
  { id: "reportes", label: "Reportes", title: "Reportes", icon: BarChart3 }
];

const emptyData = {
  clientes: [],
  productos: [],
  pedidos: [],
  inventario: [],
  entregas: [],
  facturas: [],
  gastos: [],
  cuentas: [],
  asientos: [],
  lineas: []
};

const examples = {
  clientes: [{ nombre: "Ejemplo: Pulperia La Central", telefono: "2222-0000", zona: "San Jose" }],
  productos: [{ nombre: "Ejemplo: Yogurt fresa 1L", categoria: "Yogurt", precio: 1850 }],
  inventario: [{ lote: "YOG-001", fecha_creacion: "2026-05-20", fecha_vencimiento: "2026-06-20", cantidad: 24 }],
  factura: { cliente_nombre: "Ejemplo: Pulperia La Central", numero: "F-0001", monto: 22200, estado: "Pendiente" },
  cuentas: [
    { codigo: "1-01", nombre: "Caja", tipo: "Activo" },
    { codigo: "4-01", nombre: "Ventas", tipo: "Ingreso" },
    { codigo: "5-01", nombre: "Materia prima", tipo: "Gasto" }
  ]
};

const initialForms = {
  cliente: { nombre: "", telefono: "", zona: "", tipo: "Minorista" },
  producto: { nombre: "", categoria: "Yogurt", precio: "", stock_minimo: "0", stock_inicial: "0", lote: "" },
  pedido: { cliente_id: "", cliente_nombre: "", producto_id: "", producto_nombre: "", cantidad: "", estado: "Pendiente" },
  inventario: {
    producto_id: "",
    producto_nombre: "",
    tipo: "Entrada",
    cantidad: "",
    lote: "",
    fecha_creacion: "",
    fecha_vencimiento: "",
    motivo: ""
  },
  entrega: { cliente_nombre: "", ruta: "", fecha_entrega: "", estado: "Programada" },
  factura: { pedido_id: "", cliente_id: "", cliente_nombre: "", numero: "", monto: "", estado: "Borrador" },
  gasto: { fecha: "", proveedor: "", categoria: "Gasto general", descripcion: "", monto: "", metodo_pago: "Caja/Banco" },
  cuenta: { codigo: "", nombre: "", tipo: "Activo" },
  asiento: {
    fecha: "",
    referencia: "",
    descripcion: "",
    cuenta_debe: "",
    monto_debe: "",
    cuenta_haber: "",
    monto_haber: ""
  }
};

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [data, setData] = useState(emptyData);
  const [forms, setForms] = useState(initialForms);

  useEffect(() => {
    if (loggedIn) loadAll();
  }, [loggedIn]);

  const totals = useMemo(() => {
    const totalFacturado = sum(data.facturas, "monto");
    const pendiente = sum(data.facturas.filter((item) => item.estado !== "Pagada"), "monto");
    const ingresos = accountingTotal(data, "Ingreso");
    const gastos = accountingTotal(data, "Gasto");
    return {
      totalFacturado,
      pendiente,
      ingresos,
      gastos,
      utilidad: ingresos - gastos
    };
  }, [data]);

  async function loadAll() {
    setLoading(true);
    setNotice("");

    if (!supabaseEnabled) {
      setData(emptyData);
      setNotice("Conecta Supabase en .env para guardar datos reales. Por ahora todo inicia en cero.");
      setLoading(false);
      return;
    }

    const requests = await Promise.all([
      supabase.from("clientes").select("*").order("created_at", { ascending: false }),
      supabase.from("productos").select("*").order("created_at", { ascending: false }),
      supabase.from("pedidos").select("*").order("created_at", { ascending: false }),
      supabase.from("inventario_movimientos").select("*").order("created_at", { ascending: false }),
      supabase.from("entregas").select("*").order("created_at", { ascending: false }),
      supabase.from("facturas").select("*").order("created_at", { ascending: false }),
      supabase.from("gastos").select("*").order("created_at", { ascending: false }),
      supabase.from("contabilidad_cuentas").select("*").order("codigo", { ascending: true }),
      supabase.from("contabilidad_asientos").select("*").order("fecha", { ascending: false }),
      supabase.from("contabilidad_lineas").select("*")
    ]);

    const hasError = requests.find((result) => result.error);
    if (hasError) {
      setNotice(`Supabase respondio: ${hasError.error.message}`);
    }

    setData({
      clientes: requests[0].data || [],
      productos: requests[1].data || [],
      pedidos: requests[2].data || [],
      inventario: requests[3].data || [],
      entregas: requests[4].data || [],
      facturas: requests[5].data || [],
      gastos: requests[6].data || [],
      cuentas: requests[7].data || [],
      asientos: requests[8].data || [],
      lineas: requests[9].data || []
    });
    setLoading(false);
  }

  async function insertRecord(table, payload, formKey) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar. El formulario queda como ejemplo mientras el backend no este configurado.");
      return;
    }

    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      setNotice(error.message);
      return;
    }

    setForms((current) => ({ ...current, [formKey]: initialForms[formKey] }));
    await loadAll();
  }

  async function createProduct(event) {
    event.preventDefault();
    const form = forms.producto;

    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar productos e inventario.");
      return;
    }

    const { data: product, error } = await supabase
      .from("productos")
      .insert({
        nombre: form.nombre,
        categoria: form.categoria,
        precio: Number(form.precio),
        stock_minimo: Number(form.stock_minimo)
      })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    const initialStock = Number(form.stock_inicial || 0);
    if (initialStock > 0) {
      const { error: inventoryError } = await supabase.from("inventario_movimientos").insert({
        producto_id: product.id,
        producto_nombre: product.nombre,
        tipo: "Entrada",
        cantidad: initialStock,
        lote: form.lote,
        fecha_creacion: new Date().toISOString().slice(0, 10),
        motivo: "Stock inicial"
      });

      if (inventoryError) {
        setNotice(inventoryError.message);
        return;
      }
    }

    setForms((current) => ({ ...current, producto: initialForms.producto }));
    await loadAll();
  }

  async function createOrder(event) {
    event.preventDefault();
    const form = forms.pedido;
    const client = data.clientes.find((item) => item.id === form.cliente_id);
    const product = data.productos.find((item) => item.id === form.producto_id);
    const quantity = Number(form.cantidad);

    if (!client) {
      setNotice("Selecciona un cliente para crear el pedido.");
      return;
    }

    if (!product) {
      setNotice("Selecciona un producto para crear el pedido.");
      return;
    }

    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar pedidos y descontar inventario.");
      return;
    }

    const available = getProductStock(data.inventario, product.id);
    if (available <= 0) {
      setNotice(`No hay inventario disponible para ${product.nombre}.`);
      return;
    }

    if (available < quantity) {
      setNotice(`Inventario insuficiente para ${product.nombre}. Disponible: ${available}, solicitado: ${quantity}.`);
      return;
    }

    const { error } = await supabase.from("pedidos").insert({
      cliente_id: client.id,
      cliente_nombre: client.nombre,
      producto_id: product.id,
      producto_nombre: product.nombre,
      cantidad: quantity,
      monto: Number(product.precio || 0) * quantity,
      estado: form.estado
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    const { error: inventoryError } = await supabase.from("inventario_movimientos").insert({
      producto_id: product.id,
      producto_nombre: product.nombre,
      tipo: "Salida",
      cantidad: quantity,
      motivo: `Venta a ${client.nombre}`
    });

    if (inventoryError) {
      setNotice(inventoryError.message);
      return;
    }

    setForms((current) => ({ ...current, pedido: initialForms.pedido }));
    setNotice("Pedido creado e inventario descontado.");
    await loadAll();
  }

  async function createAccountingEntry(event) {
    event.preventDefault();
    const form = forms.asiento;
    const debit = Number(form.monto_debe);
    const credit = Number(form.monto_haber);

    if (debit !== credit) {
      setNotice("El asiento no cuadra: el debe y el haber deben tener el mismo monto.");
      return;
    }

    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar asientos contables reales.");
      return;
    }

    const { data: asiento, error } = await supabase
      .from("contabilidad_asientos")
      .insert({
        fecha: form.fecha,
        referencia: form.referencia,
        descripcion: form.descripcion,
        total_debe: debit,
        total_haber: credit,
        estado: "Borrador"
      })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    const { error: linesError } = await supabase.from("contabilidad_lineas").insert([
      { asiento_id: asiento.id, cuenta_id: form.cuenta_debe, debe: debit, haber: 0 },
      { asiento_id: asiento.id, cuenta_id: form.cuenta_haber, debe: 0, haber: credit }
    ]);

    if (linesError) {
      setNotice(linesError.message);
      return;
    }

    setForms((current) => ({ ...current, asiento: initialForms.asiento }));
    await loadAll();
  }

  async function createInvoiceFromOrder(order) {
    const amount = Number(order.monto || 0) || Number(order.cantidad || 0);
    const nextNumber = String(data.facturas.length + 1).padStart(4, "0");
    const payload = {
      pedido_id: order.id,
      cliente_id: order.cliente_id || null,
      cliente_nombre: order.cliente_nombre,
      numero: `F-${nextNumber}`,
      monto: amount,
      estado: "Borrador"
    };

    await createInvoice(payload, false);
    setNotice("Factura borrador creada desde pedido.");
  }

  async function ensureDefaultAccounts() {
    if (!supabaseEnabled) return null;

    const defaults = [
      { codigo: "1-01", nombre: "Caja/Banco", tipo: "Activo" },
      { codigo: "1-02", nombre: "Cuentas por cobrar", tipo: "Activo" },
      { codigo: "4-01", nombre: "Ventas", tipo: "Ingreso" },
      { codigo: "6-01", nombre: "Gasto general", tipo: "Gasto" }
    ];

    const { data: existing, error } = await supabase
      .from("contabilidad_cuentas")
      .select("*")
      .in("codigo", defaults.map((account) => account.codigo));

    if (error) {
      setNotice(error.message);
      return null;
    }

    const existingCodes = new Set((existing || []).map((account) => account.codigo));
    const missing = defaults.filter((account) => !existingCodes.has(account.codigo));

    let inserted = [];
    if (missing.length) {
      const { data: insertedRows, error: insertError } = await supabase
        .from("contabilidad_cuentas")
        .insert(missing)
        .select();

      if (insertError) {
        setNotice(insertError.message);
        return null;
      }
      inserted = insertedRows || [];
    }

    return [...(existing || []), ...inserted].reduce((map, account) => {
      map[account.codigo] = account;
      return map;
    }, {});
  }

  async function createEntry({ fecha, referencia, descripcion, factura_id = null, gasto_id = null, debitAccount, creditAccount, amount }) {
    const { data: asiento, error } = await supabase
      .from("contabilidad_asientos")
      .insert({
        fecha: fecha || new Date().toISOString().slice(0, 10),
        referencia,
        descripcion,
        total_debe: amount,
        total_haber: amount,
        estado: "Automatico",
        factura_id,
        gasto_id
      })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return null;
    }

    const { error: lineError } = await supabase.from("contabilidad_lineas").insert([
      { asiento_id: asiento.id, cuenta_id: debitAccount.id, debe: amount, haber: 0, descripcion },
      { asiento_id: asiento.id, cuenta_id: creditAccount.id, debe: 0, haber: amount, descripcion }
    ]);

    if (lineError) {
      setNotice(lineError.message);
      return null;
    }

    return asiento;
  }

  async function createAccountingFromInvoice(invoice, shouldReload = true) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para crear el asiento contable de la factura.");
      return;
    }

    const accounts = await ensureDefaultAccounts();
    if (!accounts) return;

    const debitAccount = invoice.estado === "Pagada" ? accounts["1-01"] : accounts["1-02"];
    const salesAccount = accounts["4-01"];

    const alreadyAccounted = data.asientos.some((entry) => entry.factura_id === invoice.id && String(entry.referencia || "").startsWith("VENTA-"));
    if (alreadyAccounted) {
      if (shouldReload) setNotice("Esta factura ya tiene un asiento contable enlazado.");
      return;
    }

    const amount = Number(invoice.monto || 0);
    await createEntry({
      fecha: invoice.fecha,
      referencia: `VENTA-${invoice.numero || invoice.id}`,
      descripcion: `Venta ${invoice.numero || ""} - ${invoice.cliente_nombre || "cliente"}`,
      factura_id: invoice.id,
      debitAccount,
      creditAccount: salesAccount,
      amount
    });

    if (shouldReload) {
      setNotice("Asiento contable creado desde la factura.");
      await loadAll();
    }
  }

  async function markInvoicePaid(invoice) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para marcar facturas como pagadas.");
      return;
    }

    const accounts = await ensureDefaultAccounts();
    if (!accounts) return;

    const alreadyPaid = data.asientos.some((entry) => entry.factura_id === invoice.id && String(entry.referencia || "").startsWith("PAGO-"));

    const { error } = await supabase.from("facturas").update({ estado: "Pagada" }).eq("id", invoice.id);
    if (error) {
      setNotice(error.message);
      return;
    }

    await createAccountingFromInvoice({ ...invoice, estado: "Pendiente" }, false);

    if (!alreadyPaid && invoice.estado !== "Pagada") {
      await createEntry({
        fecha: new Date().toISOString().slice(0, 10),
        referencia: `PAGO-${invoice.numero || invoice.id}`,
        descripcion: `Pago de factura ${invoice.numero || ""}`,
        factura_id: invoice.id,
        debitAccount: accounts["1-01"],
        creditAccount: accounts["1-02"],
        amount: Number(invoice.monto || 0)
      });
    }

    setNotice("Factura marcada como pagada y pago contabilizado.");
    await loadAll();
  }

  async function createInvoice(payload, resetForm = true) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar facturas.");
      return;
    }

    const { data: invoice, error } = await supabase
      .from("facturas")
      .insert({ ...payload, monto: Number(payload.monto || 0) })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    if (invoice.estado === "Pagada") {
      await createAccountingFromInvoice(invoice, false);
      setNotice("Factura pagada creada y contabilizada como ingreso.");
    } else if (invoice.estado === "Pendiente") {
      await createAccountingFromInvoice(invoice, false);
      setNotice("Factura pendiente creada y registrada en cuentas por cobrar.");
    } else {
      setNotice("Factura creada.");
    }

    if (resetForm) {
      setForms((current) => ({ ...current, factura: initialForms.factura }));
    }

    await loadAll();
  }

  async function deleteInvoice(invoice) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para eliminar facturas.");
      return;
    }

    const relatedEntries = data.asientos.filter((entry) => entry.factura_id === invoice.id);
    const relatedEntryIds = relatedEntries.map((entry) => entry.id);

    if (relatedEntryIds.length) {
      const { error: lineError } = await supabase
        .from("contabilidad_lineas")
        .delete()
        .in("asiento_id", relatedEntryIds);

      if (lineError) {
        setNotice(lineError.message);
        return;
      }
    }

    const { error: accountingError } = await supabase
      .from("contabilidad_asientos")
      .delete()
      .eq("factura_id", invoice.id);

    if (accountingError) {
      setNotice(accountingError.message);
      return;
    }

    const { data: deletedRows, error } = await supabase
      .from("facturas")
      .delete()
      .eq("id", invoice.id)
      .select("id");

    if (error) {
      setNotice(error.message);
      return;
    }

    if (!deletedRows?.length) {
      setNotice("No se elimino la factura. Revisa que hayas ejecutado la migracion de permisos DELETE en Supabase.");
      return;
    }

    setNotice("Factura eliminada junto con su asiento contable enlazado.");
    await loadAll();
  }

  async function createExpense(event) {
    event.preventDefault();
    const form = forms.gasto;

    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para guardar gastos.");
      return;
    }

    const accounts = await ensureDefaultAccounts();
    if (!accounts) return;

    const amount = Number(form.monto || 0);
    const { data: gasto, error } = await supabase
      .from("gastos")
      .insert({ ...form, monto: amount, fecha: form.fecha || new Date().toISOString().slice(0, 10) })
      .select()
      .single();

    if (error) {
      setNotice(error.message);
      return;
    }

    await createEntry({
      fecha: gasto.fecha,
      referencia: `GASTO-${gasto.id}`,
      descripcion: `${gasto.categoria}: ${gasto.descripcion || gasto.proveedor || "gasto"}`,
      gasto_id: gasto.id,
      debitAccount: accounts["6-01"],
      creditAccount: accounts["1-01"],
      amount
    });

    setForms((current) => ({ ...current, gasto: initialForms.gasto }));
    setNotice("Gasto registrado y contabilizado.");
    await loadAll();
  }

  async function deleteExpense(gasto) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para eliminar gastos.");
      return;
    }

    const entries = data.asientos.filter((entry) => entry.gasto_id === gasto.id);
    const entryIds = entries.map((entry) => entry.id);

    if (entryIds.length) {
      const { error: lineError } = await supabase.from("contabilidad_lineas").delete().in("asiento_id", entryIds);
      if (lineError) {
        setNotice(lineError.message);
        return;
      }
    }

    const { error: entryError } = await supabase.from("contabilidad_asientos").delete().eq("gasto_id", gasto.id);
    if (entryError) {
      setNotice(entryError.message);
      return;
    }

    const { error } = await supabase.from("gastos").delete().eq("id", gasto.id);
    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice("Gasto eliminado junto con su asiento.");
    await loadAll();
  }

  async function deleteClient(client) {
    if (!supabaseEnabled) {
      setNotice("Conecta Supabase para eliminar clientes.");
      return;
    }

    const clientInvoices = data.facturas.filter(
      (invoice) => invoice.cliente_id === client.id || invoice.cliente_nombre === client.nombre
    );

    for (const invoice of clientInvoices) {
      await deleteInvoice(invoice);
    }

    const { error: pedidosError } = await supabase
      .from("pedidos")
      .delete()
      .eq("cliente_id", client.id);

    if (pedidosError) {
      setNotice(pedidosError.message);
      return;
    }

    const { data: deletedRows, error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", client.id)
      .select("id");

    if (error) {
      setNotice(error.message);
      return;
    }

    if (!deletedRows?.length) {
      setNotice("No se elimino el cliente. Revisa permisos DELETE en Supabase.");
      return;
    }

    setNotice("Cliente eliminado junto con pedidos/facturas enlazadas.");
    await loadAll();
  }

  function setForm(formKey, field, value) {
    setForms((current) => ({
      ...current,
      [formKey]: { ...current[formKey], [field]: value }
    }));
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  const current = modules.find((item) => item.id === active);

  function openView(viewId) {
    setActive(viewId);
    setMenuOpen(false);
  }

  return (
    <main className={`app-shell ${menuOpen ? "menu-open" : ""}`}>
      <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
        <Menu size={22} />
      </button>
      {menuOpen && <button className="menu-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu" />}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span>G</span>
          <div>
            <strong>Gumapa</strong>
            <small>Yogurt y helados</small>
          </div>
        </div>
        <nav>
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => openView(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="logout" onClick={() => {
          setMenuOpen(false);
          setLoggedIn(false);
        }}>
          <LogOut size={18} />
          Salir
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{supabaseEnabled ? "Supabase conectado" : "Modo plantilla"}</p>
            <h1>{current.title}</h1>
          </div>
          <button className="secondary" onClick={loadAll} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </header>

        {notice && <div className="notice">{notice}</div>}

        <section className="content">
          {active === "dashboard" && <Dashboard data={data} totals={totals} />}
          {active === "clientes" && (
            <Clients
              form={forms.cliente}
              setForm={setForm}
              insertRecord={insertRecord}
              rows={data.clientes}
              deleteClient={deleteClient}
            />
          )}
          {active === "productos" && (
            <Products data={data} form={forms.producto} setForm={setForm} createProduct={createProduct} />
          )}
          {active === "pedidos" && (
            <Orders
              data={data}
              form={forms.pedido}
              setForm={setForm}
              createOrder={createOrder}
              createInvoiceFromOrder={createInvoiceFromOrder}
            />
          )}
          {active === "inventario" && (
            <Inventory
              data={data}
              form={forms.inventario}
              setForm={setForm}
              insertRecord={insertRecord}
            />
          )}
          {active === "entregas" && (
            <SimpleModule
              title="Nueva entrega"
              form={forms.entrega}
              onChange={(field, value) => setForm("entrega", field, value)}
              onSubmit={(payload) => insertRecord("entregas", payload, "entrega")}
              fields={[
                ["cliente_nombre", "Cliente"],
                ["ruta", "Ruta"],
                ["fecha_entrega", "Fecha", "date"],
                ["estado", "Estado"]
              ]}
              rows={data.entregas}
            />
          )}
          {active === "facturacion" && (
            <Billing
              data={data}
              form={forms.factura}
              setForm={setForm}
              createInvoice={createInvoice}
              createAccountingFromInvoice={createAccountingFromInvoice}
              markInvoicePaid={markInvoicePaid}
              deleteInvoice={deleteInvoice}
            />
          )}
          {active === "contabilidad" && (
            <Accounting
              data={data}
              totals={totals}
              forms={forms}
              setForm={setForm}
              createAccountingEntry={createAccountingEntry}
              insertRecord={insertRecord}
              createExpense={createExpense}
              deleteExpense={deleteExpense}
            />
          )}
          {active === "reportes" && <Reports data={data} totals={totals} />}
        </section>
      </section>
    </main>
  );
}

function Login({ onLogin }) {
  const loginUser = import.meta.env.VITE_APP_LOGIN_USER || "gumapa";
  const loginPassword = import.meta.env.VITE_APP_LOGIN_PASSWORD || "gumapa2026";
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (user === loginUser && password === loginPassword) {
      onLogin();
      return;
    }
    setError("Usuario o contrasena incorrectos.");
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand large">
          <span>G</span>
          <div>
            <strong>Gumapa</strong>
            <small>Sistema administrativo</small>
          </div>
        </div>
        <label>
          Usuario
          <input value={user} onChange={(event) => setUser(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Contrasena
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary">Ingresar</button>
      </form>
    </main>
  );
}

function Dashboard({ data, totals }) {
  return (
    <>
      <Kpis
        items={[
          ["Clientes", data.clientes.length],
          ["Productos", data.productos.length],
          ["Facturado", money(totals.totalFacturado)],
          ["Utilidad", money(totals.utilidad)]
        ]}
      />
      <div className="grid two">
        <Panel title="Operacion">
          <Record title="Pedidos" detail={`${data.pedidos.length} pedidos registrados`} status="0 inicial" />
          <Record title="Entregas" detail={`${data.entregas.length} rutas registradas`} status="0 inicial" />
          <Record title="Inventario" detail={`${data.inventario.length} movimientos`} status="0 inicial" />
        </Panel>
        <Panel title="Finanzas">
          <Record title="Pendiente de cobro" detail={money(totals.pendiente)} status="Facturas" tone="warn" />
          <Record title="Ingresos contables" detail={money(totals.ingresos)} status="Debe/Haber" />
          <Record title="Gastos contables" detail={money(totals.gastos)} status="Control" tone="warn" />
        </Panel>
      </div>
    </>
  );
}

function SimpleModule({ title, form, fields, onChange, onSubmit, rows, example }) {
  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="grid two">
      <Panel title={title}>
        <form className="form" onSubmit={submit}>
          {fields.map(([name, label, type = "text"]) => (
            <label key={name}>
              {label}
              <input type={type} value={form[name] || ""} onChange={(event) => onChange(name, event.target.value)} required />
            </label>
          ))}
          <button className="primary">Guardar</button>
        </form>
        {example && <Example item={example} />}
      </Panel>
      <Panel title="Registros">
        <Rows rows={rows} />
      </Panel>
    </div>
  );
}

function Clients({ form, setForm, insertRecord, rows, deleteClient }) {
  function submit(event) {
    event.preventDefault();
    insertRecord("clientes", form, "cliente");
  }

  return (
    <div className="grid two">
      <Panel title="Nuevo cliente">
        <form className="form" onSubmit={submit}>
          <label>
            Nombre
            <input value={form.nombre} onChange={(event) => setForm("cliente", "nombre", event.target.value)} required />
          </label>
          <div className="split">
            <label>
              Telefono
              <input value={form.telefono} onChange={(event) => setForm("cliente", "telefono", event.target.value)} required />
            </label>
            <label>
              Zona
              <input value={form.zona} onChange={(event) => setForm("cliente", "zona", event.target.value)} required />
            </label>
          </div>
          <label>
            Tipo
            <input value={form.tipo} onChange={(event) => setForm("cliente", "tipo", event.target.value)} required />
          </label>
          <button className="primary">Guardar cliente</button>
        </form>
        <Example item={examples.clientes[0]} />
      </Panel>
      <Panel title="Clientes creados">
        {!rows.length && <div className="empty">Sin clientes todavia.</div>}
        <div className="rows">
          {rows.map((client) => (
            <article className="record" key={client.id}>
              <div>
                <strong>{client.nombre}</strong>
                <p>{compact(client)}</p>
              </div>
              <div className="actions">
                <button className="secondary danger-button" type="button" onClick={() => deleteClient(client)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Products({ data, form, setForm, createProduct }) {
  return (
    <div className="grid two">
      <Panel title="Nuevo producto">
        <form className="form" onSubmit={createProduct}>
          <label>
            Nombre
            <input value={form.nombre} onChange={(event) => setForm("producto", "nombre", event.target.value)} required />
          </label>
          <div className="split">
            <label>
              Categoria
              <select value={form.categoria} onChange={(event) => setForm("producto", "categoria", event.target.value)}>
                <option value="Yogurt">Yogurt</option>
                <option value="Helados">Helados</option>
              </select>
            </label>
            <label>
              Precio
              <input type="number" value={form.precio} onChange={(event) => setForm("producto", "precio", event.target.value)} required />
            </label>
          </div>
          <div className="split">
            <label>
              Stock minimo
              <input type="number" value={form.stock_minimo} onChange={(event) => setForm("producto", "stock_minimo", event.target.value)} required />
            </label>
            <label>
              Stock inicial
              <input type="number" value={form.stock_inicial} onChange={(event) => setForm("producto", "stock_inicial", event.target.value)} />
            </label>
          </div>
          <label>
            Lote inicial
            <input value={form.lote} onChange={(event) => setForm("producto", "lote", event.target.value)} />
          </label>
          <button className="primary">Guardar producto</button>
        </form>
        <Example item={examples.productos[0]} />
      </Panel>
      <Panel title="Productos">
        {!data.productos.length && <div className="empty">Sin productos todavia. Agrega yogurt o helados para empezar inventario.</div>}
        <div className="rows">
          {data.productos.map((product) => {
            const stock = getProductStock(data.inventario, product.id);
            const isEmpty = stock <= 0;
            const isLow = !isEmpty && stock <= Number(product.stock_minimo || 0);
            const tone = isEmpty || isLow ? "warn" : "";
            return (
              <Record
                key={product.id}
                title={product.nombre}
                detail={`${product.categoria} - ${money(product.precio)} - Stock: ${stock}`}
                status={isEmpty ? "Sin stock" : isLow ? "Bajo" : "Disponible"}
                tone={tone}
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Orders({ data, form, setForm, createOrder, createInvoiceFromOrder }) {
  const selectedProduct = data.productos.find((item) => item.id === form.producto_id);
  const selectedStock = selectedProduct ? getProductStock(data.inventario, selectedProduct.id) : 0;
  const requestedQuantity = Number(form.cantidad || 0);
  const remainingStock = selectedStock - requestedQuantity;
  const stockMinimum = Number(selectedProduct?.stock_minimo || 0);
  const hasStockWarning = selectedProduct && requestedQuantity > 0 && remainingStock < 0;
  const hasLowStockWarning = selectedProduct && requestedQuantity > 0 && remainingStock >= 0 && remainingStock <= stockMinimum;

  function selectProduct(productId) {
    const product = data.productos.find((item) => item.id === productId);
    setForm("pedido", "producto_id", productId);
    setForm("pedido", "producto_nombre", product?.nombre || "");
  }

  function selectClient(clientId) {
    const client = data.clientes.find((item) => item.id === clientId);
    setForm("pedido", "cliente_id", clientId);
    setForm("pedido", "cliente_nombre", client?.nombre || "");
  }

  return (
    <div className="grid two">
      <Panel title="Nuevo pedido">
        <form className="form" onSubmit={createOrder}>
          <label>
            Cliente
            <select value={form.cliente_id} onChange={(event) => selectClient(event.target.value)} required>
              <option value="">Selecciona cliente</option>
              {data.clientes.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre} - {client.tipo || "Cliente"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Producto
            <select value={form.producto_id} onChange={(event) => selectProduct(event.target.value)} required>
              <option value="">Selecciona producto</option>
              {data.productos.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nombre} - {product.categoria} - stock {getProductStock(data.inventario, product.id)}
                </option>
              ))}
            </select>
          </label>
          {selectedProduct && (
            <div className={`inventory-alert ${hasStockWarning ? "danger" : hasLowStockWarning ? "warn" : ""}`}>
              <strong>Inventario disponible: {selectedStock}</strong>
              <span>
                {requestedQuantity > 0
                  ? hasStockWarning
                    ? `No alcanza. Faltan ${Math.abs(remainingStock)} unidades.`
                    : `Despues del pedido quedarian ${remainingStock} unidades.`
                  : "Indica la cantidad para calcular el inventario restante."}
              </span>
            </div>
          )}
          <div className="split">
            <label>
              Cantidad
              <input type="number" value={form.cantidad} onChange={(event) => setForm("pedido", "cantidad", event.target.value)} required />
            </label>
            <label>
              Estado
              <input value={form.estado} onChange={(event) => setForm("pedido", "estado", event.target.value)} required />
            </label>
          </div>
          <button className="primary" disabled={hasStockWarning}>Guardar pedido</button>
        </form>
      </Panel>
      <Panel title="Pedidos enlazables">
        {!data.pedidos.length && <div className="empty">Sin pedidos todavia. Cuando exista un pedido, podras crear su factura desde aqui.</div>}
        <div className="rows">
          {data.pedidos.map((order) => (
            <article className="record" key={order.id}>
              <div>
                <strong>{order.cliente_nombre || "Pedido"}</strong>
                <p>{compact(order)}</p>
              </div>
              <div className="actions">
                <button className="secondary" type="button" onClick={() => createInvoiceFromOrder(order)}>
                  <FileText size={16} />
                  Facturar
                </button>
                <a className="secondary action-link" href="https://ovitribucr.hacienda.go.cr/home/" target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  OviTribuCR
                </a>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Inventory({ data, form, setForm, insertRecord }) {
  function submit(event) {
    event.preventDefault();
    const product = data.productos.find((item) => item.id === form.producto_id);
    insertRecord(
      "inventario_movimientos",
      {
        ...form,
        producto_nombre: product?.nombre || form.producto_nombre,
        cantidad: Number(form.cantidad)
      },
      "inventario"
    );
  }

  function selectProduct(productId) {
    const product = data.productos.find((item) => item.id === productId);
    setForm("inventario", "producto_id", productId);
    setForm("inventario", "producto_nombre", product?.nombre || "");
  }

  return (
    <div className="grid two">
      <Panel title="Nuevo movimiento">
        <form className="form" onSubmit={submit}>
          <label>
            Producto
            <select value={form.producto_id || ""} onChange={(event) => selectProduct(event.target.value)} required>
              <option value="">Selecciona producto</option>
              {data.productos.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nombre} - {product.categoria}
                </option>
              ))}
            </select>
          </label>
          <div className="split">
            <label>
              Tipo
              <select value={form.tipo} onChange={(event) => setForm("inventario", "tipo", event.target.value)}>
                {["Entrada", "Salida", "Ajuste"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Cantidad
              <input type="number" value={form.cantidad} onChange={(event) => setForm("inventario", "cantidad", event.target.value)} required />
            </label>
          </div>
          <label>
            Lote
            <input value={form.lote} onChange={(event) => setForm("inventario", "lote", event.target.value)} required />
          </label>
          <div className="split">
            <label>
              Fecha de creacion
              <input type="date" value={form.fecha_creacion} onChange={(event) => setForm("inventario", "fecha_creacion", event.target.value)} required />
            </label>
            <label>
              Fecha de vencimiento
              <input type="date" value={form.fecha_vencimiento} onChange={(event) => setForm("inventario", "fecha_vencimiento", event.target.value)} required />
            </label>
          </div>
          <label>
            Motivo
            <input value={form.motivo} onChange={(event) => setForm("inventario", "motivo", event.target.value)} />
          </label>
          <button className="primary">Guardar inventario</button>
        </form>
        <Example item={examples.inventario[0]} />
      </Panel>
      <Panel title="Movimientos de inventario">
        <div className="stock-summary">
          {data.productos.map((product) => (
            <Record
              key={product.id}
              title={product.nombre}
              detail={`${product.categoria} - stock actual ${getProductStock(data.inventario, product.id)}`}
              status="Stock"
            />
          ))}
        </div>
        <Rows rows={data.inventario} />
      </Panel>
    </div>
  );
}

function Billing({ data, form, setForm, createInvoice, createAccountingFromInvoice, markInvoicePaid, deleteInvoice }) {
  const selectedOrder = data.pedidos.find((order) => order.id === form.pedido_id);

  function submit(event) {
    event.preventDefault();
    createInvoice({ ...form, monto: Number(form.monto) });
  }

  function applyOrder(orderId) {
    const order = data.pedidos.find((item) => item.id === orderId);
    setForm("factura", "pedido_id", orderId);
    if (!order) return;
    setForm("factura", "cliente_id", order.cliente_id || "");
    setForm("factura", "cliente_nombre", order.cliente_nombre || "");
    setForm("factura", "monto", String(Number(order.monto || 0) || Number(order.cantidad || 0)));
  }

  function selectClient(clientId) {
    const client = data.clientes.find((item) => item.id === clientId);
    setForm("factura", "cliente_id", clientId);
    setForm("factura", "cliente_nombre", client?.nombre || "");
  }

  return (
    <>
      <div className="grid two">
        <Panel title="Nueva factura">
          <form className="form" onSubmit={submit}>
            <label>
              Pedido relacionado
              <select value={form.pedido_id} onChange={(event) => applyOrder(event.target.value)}>
                <option value="">Sin pedido</option>
                {data.pedidos.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.cliente_nombre || "Pedido"} - {order.producto_nombre || "producto"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cliente
              <select value={form.cliente_id} onChange={(event) => selectClient(event.target.value)} required>
                <option value="">Selecciona cliente</option>
                {data.clientes.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nombre} - {client.tipo || "Cliente"}
                  </option>
                ))}
              </select>
            </label>
            <div className="split">
              <label>
                Numero
                <input value={form.numero} onChange={(event) => setForm("factura", "numero", event.target.value)} required />
              </label>
              <label>
                Monto
                <input type="number" value={form.monto} onChange={(event) => setForm("factura", "monto", event.target.value)} required />
              </label>
            </div>
            <div className="split">
              <label>
                Estado
                <select value={form.estado} onChange={(event) => setForm("factura", "estado", event.target.value)}>
                  {["Borrador", "Pendiente", "Pagada", "Anulada"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <button className="primary">Guardar factura</button>
          </form>
          {selectedOrder && <Example item={{ enlace: "Pedido seleccionado", pedido: selectedOrder.cliente_nombre, producto: selectedOrder.producto_nombre }} />}
          <Example item={examples.factura} />
        </Panel>

        <Panel title="Sistema externo de facturas">
          <div className="link-list">
            <a href="https://ovitribucr.hacienda.go.cr/home/" target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              OviTributCR
            </a>
          </div>
          <div className="empty">
            Este sistema conserva pedidos, facturas internas y contabilidad. Para emitir facturas electronicas, abre OviTribuCR desde este enlace.
          </div>
        </Panel>
      </div>

      <Panel title="Facturas enlazadas">
        {!data.facturas.length && <div className="empty">Sin facturas todavia. Puedes crearlas desde pedidos o manualmente.</div>}
        <div className="rows">
          {data.facturas.map((invoice) => (
            <article className="record" key={invoice.id}>
              <div>
                <strong>{invoice.numero || invoice.cliente_nombre || "Factura"}</strong>
                <p>{compact(invoice)}</p>
              </div>
              <div className="actions">
                <button className="secondary" type="button" onClick={() => createAccountingFromInvoice(invoice)}>
                  <Calculator size={16} />
                  Contabilizar
                </button>
                {invoice.estado !== "Pagada" && (
                  <button className="secondary" type="button" onClick={() => markInvoicePaid(invoice)}>
                    Pagada
                  </button>
                )}
                <button className="secondary danger-button" type="button" onClick={() => deleteInvoice(invoice)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Accounting({ data, totals, forms, setForm, createAccountingEntry, insertRecord, createExpense, deleteExpense }) {
  return (
    <>
      <Kpis
        items={[
          ["Ingresos", money(totals.ingresos)],
          ["Gastos", money(totals.gastos)],
          ["Utilidad neta", money(totals.utilidad)],
          ["Asientos", data.asientos.length]
        ]}
      />
      <div className="grid two">
        <Panel title="Gasto rapido">
          <form className="form" onSubmit={createExpense}>
            <div className="split">
              <label>
                Fecha
                <input type="date" value={forms.gasto.fecha} onChange={(event) => setForm("gasto", "fecha", event.target.value)} />
              </label>
              <label>
                Monto
                <input type="number" value={forms.gasto.monto} onChange={(event) => setForm("gasto", "monto", event.target.value)} required />
              </label>
            </div>
            <label>
              Proveedor
              <input value={forms.gasto.proveedor} onChange={(event) => setForm("gasto", "proveedor", event.target.value)} />
            </label>
            <div className="split">
              <label>
                Categoria
                <select value={forms.gasto.categoria} onChange={(event) => setForm("gasto", "categoria", event.target.value)}>
                  {["Gasto general", "Materia prima", "Transporte", "Servicios", "Alquiler", "Planilla"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Metodo de pago
                <select value={forms.gasto.metodo_pago} onChange={(event) => setForm("gasto", "metodo_pago", event.target.value)}>
                  {["Caja/Banco", "Efectivo", "Transferencia", "Tarjeta"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <label>
              Descripcion
              <input value={forms.gasto.descripcion} onChange={(event) => setForm("gasto", "descripcion", event.target.value)} />
            </label>
            <button className="primary">Guardar gasto</button>
          </form>
        </Panel>
        <Panel title="Gastos registrados">
          {!data.gastos.length && <div className="empty">Sin gastos todavia.</div>}
          <div className="rows">
            {data.gastos.map((gasto) => (
              <article className="record" key={gasto.id}>
                <div>
                  <strong>{gasto.categoria}</strong>
                  <p>{compact(gasto)}</p>
                </div>
                <div className="actions">
                  <button className="secondary danger-button" type="button" onClick={() => deleteExpense(gasto)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid two">
        <Panel title="Catalogo de cuentas">
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              insertRecord("contabilidad_cuentas", forms.cuenta, "cuenta");
            }}
          >
            <label>
              Codigo
              <input value={forms.cuenta.codigo} onChange={(event) => setForm("cuenta", "codigo", event.target.value)} required />
            </label>
            <label>
              Nombre
              <input value={forms.cuenta.nombre} onChange={(event) => setForm("cuenta", "nombre", event.target.value)} required />
            </label>
            <label>
              Tipo
              <select value={forms.cuenta.tipo} onChange={(event) => setForm("cuenta", "tipo", event.target.value)}>
                {["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto", "Costo"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button className="primary">Crear cuenta</button>
          </form>
          <Example item={examples.cuentas[0]} />
        </Panel>

        <Panel title="Asiento contable">
          <form className="form" onSubmit={createAccountingEntry}>
            <label>
              Fecha
              <input type="date" value={forms.asiento.fecha} onChange={(event) => setForm("asiento", "fecha", event.target.value)} required />
            </label>
            <label>
              Referencia
              <input value={forms.asiento.referencia} onChange={(event) => setForm("asiento", "referencia", event.target.value)} required />
            </label>
            <label>
              Descripcion
              <input value={forms.asiento.descripcion} onChange={(event) => setForm("asiento", "descripcion", event.target.value)} required />
            </label>
            <div className="split">
              <label>
                Cuenta debe
                <select value={forms.asiento.cuenta_debe} onChange={(event) => setForm("asiento", "cuenta_debe", event.target.value)} required>
                  <option value="">Seleccione</option>
                  {data.cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.codigo} - {cuenta.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Monto debe
                <input type="number" value={forms.asiento.monto_debe} onChange={(event) => setForm("asiento", "monto_debe", event.target.value)} required />
              </label>
            </div>
            <div className="split">
              <label>
                Cuenta haber
                <select value={forms.asiento.cuenta_haber} onChange={(event) => setForm("asiento", "cuenta_haber", event.target.value)} required>
                  <option value="">Seleccione</option>
                  {data.cuentas.map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.codigo} - {cuenta.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Monto haber
                <input type="number" value={forms.asiento.monto_haber} onChange={(event) => setForm("asiento", "monto_haber", event.target.value)} required />
              </label>
            </div>
            <button className="primary">Guardar asiento</button>
          </form>
        </Panel>
      </div>
      <div className="grid two">
        <Panel title="Cuentas">
          <Rows rows={data.cuentas} />
        </Panel>
        <Panel title="Asientos">
          <Rows rows={data.asientos} />
        </Panel>
      </div>
    </>
  );
}

function Reports({ data, totals }) {
  return (
    <>
      <Kpis
        items={[
          ["Ventas", money(totals.totalFacturado)],
          ["Cobro pendiente", money(totals.pendiente)],
          ["Utilidad", money(totals.utilidad)],
          ["Cuentas", data.cuentas.length]
        ]}
      />
      <Panel title="Estado rapido de resultados">
        <div className="statement">
          <span>Ingresos</span>
          <strong>{money(totals.ingresos)}</strong>
          <span>Gastos y costos</span>
          <strong>{money(totals.gastos)}</strong>
          <span>Resultado neto</span>
          <strong>{money(totals.utilidad)}</strong>
        </div>
      </Panel>
    </>
  );
}

function Kpis({ items }) {
  return (
    <section className="kpis">
      {items.map(([label, value]) => (
        <article className="kpi" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }) {
  if (!rows.length) {
    return <div className="empty">Sin registros todavia. Los totales quedan en 0 hasta conectar Supabase y guardar datos.</div>;
  }

  return (
    <div className="rows">
      {rows.map((row) => (
        <Record key={row.id || JSON.stringify(row)} title={row.nombre || row.numero || row.referencia || row.cliente_nombre || "Registro"} detail={compact(row)} status={row.estado || row.tipo || "Activo"} />
      ))}
    </div>
  );
}

function Record({ title, detail, status, tone = "" }) {
  return (
    <article className="record">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span className={`pill ${tone}`}>{status}</span>
    </article>
  );
}

function Example({ item }) {
  return (
    <div className="example">
      <PackagePlus size={16} />
      <span>Ejemplo: {compact(item)}</span>
    </div>
  );
}

function sum(rows, field) {
  return rows.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function accountingTotal(data, type) {
  const accountIds = new Set(data.cuentas.filter((cuenta) => cuenta.tipo === type).map((cuenta) => cuenta.id));
  return data.lineas
    .filter((linea) => accountIds.has(linea.cuenta_id))
    .reduce((total, linea) => total + Math.abs(Number(linea.haber || 0) - Number(linea.debe || 0)), 0);
}

function getProductStock(movements, productId) {
  return movements
    .filter((movement) => movement.producto_id === productId)
    .reduce((total, movement) => {
      const quantity = Number(movement.cantidad || 0);
      if (movement.tipo === "Entrada") return total + quantity;
      if (movement.tipo === "Salida") return total - quantity;
      return total + quantity;
    }, 0);
}

function money(value) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function compact(row) {
  return Object.entries(row)
    .filter(([key, value]) => !["id", "created_at", "updated_at"].includes(key) && value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${labelize(key)}: ${value}`)
    .join(" · ");
}

function labelize(key) {
  return key.replaceAll("_", " ");
}

createRoot(document.getElementById("root")).render(<App />);
