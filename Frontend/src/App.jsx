import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

// const API_URL = "http://localhost:5000/api";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PRODUCTS_PER_PAGE = 6;
const SALES_PER_PAGE = 5;

function App() {
  const [activeTab, setActiveTab] = useState("inventory");

  // =====================================================
  // INVENTORY
  // =====================================================
  const [allProducts, setAllProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // =====================================================
  // EDIT PRODUCT (NEW)
  // =====================================================
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    addQuantity: "",
    costPrice: "",
    sellingPrice: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // =====================================================
  // DAILY SALES
  // =====================================================
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [allDaySales, setAllDaySales] = useState([]);
  const [salesPage, setSalesPage] = useState(1);
  const [dayTotalAmount, setDayTotalAmount] = useState(0);
  const [dayTotalUnits, setDayTotalUnits] = useState(0);
  const [salesLoading, setSalesLoading] = useState(false);

  // =====================================================
  // MONTHLY REPORT (NEW)
  // =====================================================
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [monthly, setMonthly] = useState({
    totalRevenue: 0,
    totalCost: 0,
    profit: 0,
    totalUnits: 0,
    salesCount: 0,
  });
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // =====================================================
  // ADD STOCK FORM
  // =====================================================
  const [formData, setFormData] = useState({
    name: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "",
  });

  // =====================================================
  // FETCH ALL PRODUCTS
  // =====================================================
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const firstResponse = await axios.get(`${API_URL}/products?page=1`);

      const firstProducts = firstResponse.data.products || [];
      const totalPagesFromBackend =
        Number(firstResponse.data.totalPages) || 1;

      let combinedProducts = [...firstProducts];

      if (totalPagesFromBackend > 1) {
        const requests = [];

        for (let currentPage = 2; currentPage <= totalPagesFromBackend; currentPage++) {
          requests.push(axios.get(`${API_URL}/products?page=${currentPage}`));
        }

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          combinedProducts = [
            ...combinedProducts,
            ...(response.data.products || []),
          ];
        });
      }

      setAllProducts(combinedProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // =====================================================
  // FILTER PRODUCTS (SEARCH + LOW STOCK)
  // =====================================================
  const filteredProducts = allProducts.filter((item) => {
    const productName = String(item.name || "").toLowerCase();
    const searchText = search.trim().toLowerCase();

    const matchesSearch = productName.includes(searchText);

    const threshold = Number(item.alertThreshold ?? 5);
    const quantity = Number(item.quantity ?? 0);

    const matchesLowStock = !showLowStock || quantity <= threshold;

    return matchesSearch && matchesLowStock;
  });

  // =====================================================
  // FRONTEND PAGINATION (6 PRODUCTS)
  // =====================================================
  const totalItems = filteredProducts.length;

  const totalPages =
    totalItems === 0 ? 1 : Math.ceil(totalItems / PRODUCTS_PER_PAGE);

  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PRODUCTS_PER_PAGE;

  const visibleProducts = filteredProducts.slice(
    startIndex,
    startIndex + PRODUCTS_PER_PAGE
  );

  // =====================================================
  // LOW STOCK COUNT
  // =====================================================
  const lowStockCount = allProducts.filter((item) => {
    const quantity = Number(item.quantity ?? 0);
    const threshold = Number(item.alertThreshold ?? 5);
    return quantity <= threshold;
  }).length;

  // =====================================================
  // DAILY SALES PAGINATION (FRONTEND)
  // =====================================================
  const salesTotalItems = allDaySales.length;

  const salesTotalPages =
    salesTotalItems === 0 ? 1 : Math.ceil(salesTotalItems / SALES_PER_PAGE);

  const safeSalesPage = Math.min(salesPage, salesTotalPages);

  const salesReport = allDaySales.slice(
    (safeSalesPage - 1) * SALES_PER_PAGE,
    (safeSalesPage - 1) * SALES_PER_PAGE + SALES_PER_PAGE
  );

  // =====================================================
  // FETCH DAILY SALES
  // /stats/daily ab salesList bhi deta hai,
  // isliye ek hi request kaafi hai
  // =====================================================
  const fetchSalesReport = async () => {
    if (!selectedDate) return;

    try {
      setSalesLoading(true);

      const response = await axios.get(
        `${API_URL}/stats/daily?date=${selectedDate}`
      );

      setDayTotalAmount(Number(response.data.totalRevenue || 0));
      setDayTotalUnits(Number(response.data.totalUnits || 0));
      setAllDaySales(response.data.salesList || []);
    } catch (error) {
      console.error("Error loading sales report:", error);

      setAllDaySales([]);
      setDayTotalAmount(0);
      setDayTotalUnits(0);
    } finally {
      setSalesLoading(false);
    }
  };

  // =====================================================
  // FETCH MONTHLY REPORT (NEW)
  // =====================================================
  const fetchMonthly = async () => {
    if (!selectedMonth) return;

    try {
      setMonthlyLoading(true);

      const response = await axios.get(
        `${API_URL}/stats/monthly?month=${selectedMonth}`
      );

      setMonthly({
        totalRevenue: Number(response.data.totalRevenue || 0),
        totalCost: Number(response.data.totalCost || 0),
        profit: Number(response.data.profit || 0),
        totalUnits: Number(response.data.totalUnits || 0),
        salesCount: Number(response.data.salesCount || 0),
      });
    } catch (error) {
      console.error("Error loading monthly report:", error);

      setMonthly({
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        totalUnits: 0,
        salesCount: 0,
      });
    } finally {
      setMonthlyLoading(false);
    }
  };

  // =====================================================
  // LOAD INVENTORY
  // =====================================================
  useEffect(() => {
    if (activeTab === "inventory") {
      fetchProducts();
    }
  }, [activeTab]);

  // =====================================================
  // LOAD DAILY SALES
  // =====================================================
  useEffect(() => {
    if (activeTab === "dailylog") {
      fetchSalesReport();
    }
  }, [activeTab, selectedDate]);

  // =====================================================
  // LOAD MONTHLY REPORT
  // =====================================================
  useEffect(() => {
    if (activeTab === "dailylog") {
      fetchMonthly();
    }
  }, [activeTab, selectedMonth]);

  // =====================================================
  // RESET PAGES
  // =====================================================
  useEffect(() => {
    setPage(1);
  }, [search, showLowStock]);

  useEffect(() => {
    setSalesPage(1);
  }, [selectedDate]);

  // =====================================================
  // ADD NEW STOCK
  // Same naam ho to backend purane card mein jod dega
  // =====================================================
  const handleAddProduct = async (event) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      formData.costPrice === "" ||
      formData.sellingPrice === "" ||
      formData.quantity === ""
    ) {
      alert(
        "Please enter product name, cost price, selling price and quantity."
      );
      return;
    }

    const costPrice = Number(formData.costPrice);
    const sellingPrice = Number(formData.sellingPrice);
    const quantity = Number(formData.quantity);

    if (costPrice < 0 || sellingPrice < 0 || quantity < 0) {
      alert("Price and quantity cannot be negative.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/products`, {
        name: formData.name.trim(),
        costPrice,
        sellingPrice,
        quantity,
        alertThreshold: 5,
      });

      setFormData({
        name: "",
        costPrice: "",
        sellingPrice: "",
        quantity: "",
      });

      setPage(1);

      await fetchProducts();

      alert(
        response.data?.merged
          ? "Product pehle se tha, stock usi card mein jod diya gaya."
          : "Stock added successfully."
      );
    } catch (error) {
      console.error("Error adding stock:", error);

      alert(error.response?.data?.error || "Error adding stock.");
    }
  };

  // =====================================================
  // SELL ONE PRODUCT
  // =====================================================
  const handleSell = async (productId) => {
    try {
      await axios.post(`${API_URL}/sell`, {
        productId,
        quantity: 1,
      });

      await fetchProducts();

      if (activeTab === "dailylog") {
        await fetchSalesReport();
        await fetchMonthly();
      }
    } catch (error) {
      console.error("Error reducing stock:", error);

      alert(error.response?.data?.error || "Unable to update stock.");
    }
  };

  // =====================================================
  // DELETE PRODUCT
  // =====================================================
  const handleDelete = async (productId, productName) => {
    const confirmed = window.confirm(`"${productName}" ko delete karna hai?`);

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/products/${productId}`);

      setAllProducts((current) =>
        current.filter((product) => product._id !== productId)
      );
    } catch (error) {
      console.error("Error deleting product:", error);

      alert(error.response?.data?.error || "Unable to delete product.");
    }
  };

  // =====================================================
  // EDIT PRODUCT (NEW)
  // =====================================================
  const openEdit = (item) => {
    setEditingProduct(item);
    setEditForm({
      addQuantity: "",
      costPrice: String(item.costPrice ?? ""),
      sellingPrice: String(item.sellingPrice ?? ""),
    });
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setEditForm({ addQuantity: "", costPrice: "", sellingPrice: "" });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (editForm.costPrice === "" || editForm.sellingPrice === "") {
      alert("Cost aur selling price khali nahi ho sakte.");
      return;
    }

    try {
      setSavingEdit(true);

      const response = await axios.put(
        `${API_URL}/products/${editingProduct._id}`,
        {
          addQuantity:
            editForm.addQuantity === "" ? 0 : Number(editForm.addQuantity),
          costPrice: Number(editForm.costPrice),
          sellingPrice: Number(editForm.sellingPrice),
        }
      );

      // Card turant update
      setAllProducts((current) =>
        current.map((product) =>
          product._id === editingProduct._id ? response.data : product
        )
      );

      closeEdit();
    } catch (error) {
      console.error("Error updating product:", error);

      alert(error.response?.data?.error || "Unable to update product.");
    } finally {
      setSavingEdit(false);
    }
  };

  // =====================================================
  // DELETE SALE (NEW)
  // Stock wapas jud jata hai
  // =====================================================
  const handleDeleteSale = async (saleId, productName) => {
    const confirmed = window.confirm(
      `"${productName}" ki ye sale delete karni hai? Stock wapas jud jayega.`
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/sales/${saleId}`);

      await fetchSalesReport();
      await fetchMonthly();
    } catch (error) {
      console.error("Error deleting sale:", error);

      alert(error.response?.data?.error || "Unable to delete sale.");
    }
  };

  // =====================================================
  // PAGE SAFETY
  // =====================================================
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (salesPage > salesTotalPages) {
      setSalesPage(salesTotalPages);
    }
  }, [salesPage, salesTotalPages]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-10">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="bg-blue-600 text-white shadow-md p-4 sticky top-0 z-50 text-center">

        <h1 className="text-xl sm:text-2xl font-bold tracking-wide">
          John Naqvi
        </h1>

        <p className="text-xs text-blue-100 mt-1">
          Smart Stock Management System
        </p>

        <div className="flex justify-center gap-2 sm:gap-4 mt-3 flex-wrap">

          <button
            onClick={() => {
              setActiveTab("inventory");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "inventory"
                ? "bg-white text-blue-600 shadow"
                : "bg-blue-700 text-blue-100 hover:bg-blue-800"
            }`}
          >
            <ClipboardList className="inline w-4 h-4 mr-1" />
            Inventory
          </button>

          <button
            onClick={() => {
              setActiveTab("dailylog");
              setSalesPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "dailylog"
                ? "bg-white text-blue-600 shadow"
                : "bg-blue-700 text-blue-100 hover:bg-blue-800"
            }`}
          >
            <Calendar className="inline w-4 h-4 mr-1" />
            Daily Sales
          </button>

        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 mt-5">

        {/* =====================================================
            INVENTORY
        ===================================================== */}
        {activeTab === "inventory" && (
          <>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-3 mb-5 max-w-2xl mx-auto">

              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">

                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Total Products
                  </p>

                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mt-1">
                    {allProducts.length}
                  </h3>
                </div>

                <Layers className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />

              </div>

              <button
                onClick={() => {
                  setShowLowStock((current) => !current);
                  setPage(1);
                }}
                className={`p-3 sm:p-4 rounded-xl shadow-sm text-left border flex items-center justify-between transition-all ${
                  showLowStock
                    ? "bg-red-50 border-red-300 text-red-700 ring-2 ring-red-400"
                    : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                }`}
              >

                <div>

                  <p className="text-xs font-medium text-gray-500">
                    Low Stock Alert
                  </p>

                  <h3 className="text-xs sm:text-sm font-bold mt-1">
                    {showLowStock
                      ? "Showing Low Stock"
                      : `${lowStockCount} Items`}
                  </h3>

                </div>

                <AlertTriangle
                  className={`w-6 h-6 sm:w-7 sm:h-7 ${
                    showLowStock
                      ? "text-red-500 animate-pulse"
                      : "text-amber-500"
                  }`}
                />

              </button>

            </div>

            {showLowStock && (
              <div className="max-w-4xl mx-auto mb-5 bg-red-50 border border-red-300 text-red-700 rounded-xl p-3 text-sm font-bold text-center">
                🚨 Low Stock Alert — Showing products at or below their alert threshold.
              </div>
            )}

            {/* ADD STOCK */}
            <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 mb-5 max-w-3xl mx-auto">

              <h2 className="text-sm sm:text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Add New Stock
              </h2>

              <form onSubmit={handleAddProduct} className="space-y-3">

                <input
                  type="text"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cost Price"
                    value={formData.costPrice}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        costPrice: event.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Selling Price"
                    value={formData.sellingPrice}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        sellingPrice: event.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />

                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      quantity: event.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-all text-sm"
                >
                  Save Stock
                </button>

              </form>
            </section>

            {/* SEARCH */}
            <div className="relative mb-5 max-w-4xl mx-auto">

              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </span>

              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

            </div>

            {/* LOADING / EMPTY / CARDS */}
            {loadingProducts ? (

              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-500">Loading products...</p>
              </div>

            ) : visibleProducts.length === 0 ? (

              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-500">
                  {showLowStock
                    ? "No low stock products found."
                    : "No products found."}
                </p>
              </div>

            ) : (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {visibleProducts.map((item) => {

                  const quantity = Number(item.quantity ?? 0);
                  const threshold = Number(item.alertThreshold ?? 5);
                  const isLowStock = quantity <= threshold;

                  return (
                    <div
                      key={item._id}
                      className={`p-4 rounded-xl shadow-sm border transition-all ${
                        isLowStock
                          ? "bg-red-50 border-red-300 ring-1 ring-red-300"
                          : "bg-white border-gray-200"
                      }`}
                    >

                      <div className="flex justify-between items-start gap-3">

                        <div className="min-w-0">

                          <h3 className="font-bold text-gray-800 break-words">
                            {item.name}
                          </h3>

                          <p className="text-sm text-gray-600 mt-1">
                            Cost: ₹{Number(item.costPrice ?? 0)}
                          </p>

                          <p className="text-sm text-gray-600">
                            Selling: ₹{Number(item.sellingPrice ?? 0)}
                          </p>

                        </div>

                        <span
                          className={`text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                            isLowStock
                              ? "bg-red-200 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {quantity} pcs
                        </span>

                      </div>

                      {isLowStock && (
                        <div className="mt-3 text-xs font-bold text-red-700">
                          <AlertTriangle className="inline w-4 h-4 mr-1" />
                          Low stock
                        </div>
                      )}

                      {/* BUTTONS: Sell 1 bada, Edit + Delete chhote icon */}
                      <div className="flex gap-2 mt-4">

                        <button
                          onClick={() => handleSell(item._id)}
                          disabled={quantity <= 0}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 text-white p-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-2 font-bold text-sm"
                        >
                          <Minus className="w-4 h-4" />
                          Sell 1
                        </button>

                        <button
                          onClick={() => openEdit(item)}
                          title="Edit / Restock"
                          aria-label="Edit product"
                          className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white p-2.5 rounded-xl shadow transition-all flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item._id, item.name)}
                          title="Delete"
                          aria-label="Delete product"
                          className="bg-red-500 hover:bg-red-600 active:scale-95 text-white p-2.5 rounded-xl shadow transition-all flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

            {/* INVENTORY PAGINATION */}
            {totalItems > PRODUCTS_PER_PAGE && (

              <div className="flex items-center justify-center gap-3 mt-6">

                <button
                  onClick={() =>
                    setPage((current) => Math.max(current - 1, 1))
                  }
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <span className="text-sm font-bold">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, totalPages))
                  }
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>
            )}

            {totalItems > 0 && (
              <p className="text-center text-xs text-gray-500 mt-3">
                Showing {startIndex + 1}-
                {Math.min(startIndex + PRODUCTS_PER_PAGE, totalItems)} of{" "}
                {totalItems} products
              </p>
            )}

          </>
        )}

        {/* =====================================================
            DAILY SALES PAGE
        ===================================================== */}
        {activeTab === "dailylog" && (

          <section className="max-w-5xl mx-auto space-y-5">

            {/* ---------------- DAILY ---------------- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

                <div>

                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    Daily Sales Log
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Check sales for selected date
                  </p>

                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="border border-gray-300 p-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />

              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 text-center">

                <DollarSign className="w-7 h-7 text-blue-600 mx-auto mb-2" />

                <p className="text-sm text-gray-600">
                  Total sales for selected date
                </p>

                <h3 className="text-2xl sm:text-3xl font-bold text-blue-700 mt-1">
                  ₹ {dayTotalAmount}
                </h3>

                <p className="text-sm text-gray-600 mt-2">
                  {dayTotalUnits} units sold
                </p>

              </div>

              <div>

                <div className="flex items-center justify-between mb-4">

                  <h3 className="font-bold text-gray-800">Sold Products</h3>

                  <span className="text-xs text-gray-500">
                    {salesTotalItems} sales
                  </span>

                </div>

                {salesLoading ? (

                  <div className="border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-500 text-sm">Loading sales...</p>
                  </div>

                ) : salesReport.length === 0 ? (

                  <div className="border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-500 text-sm">
                      No products were sold on this date.
                    </p>
                  </div>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[650px] text-sm">

                      <thead>

                        <tr className="bg-gray-50 border-b">

                          <th className="text-left p-3 font-semibold">Product</th>
                          <th className="text-left p-3 font-semibold">Quantity</th>
                          <th className="text-left p-3 font-semibold">Price</th>
                          <th className="text-left p-3 font-semibold">Total</th>
                          <th className="text-left p-3 font-semibold">Time</th>
                          <th className="p-3 w-12"></th>

                        </tr>

                      </thead>

                      <tbody>

                        {salesReport.map((sale, index) => (

                          <tr
                            key={sale._id || index}
                            className="border-b last:border-b-0"
                          >

                            <td className="p-3 font-medium">
                              {sale.productName}
                            </td>

                            <td className="p-3">{sale.quantity} pcs</td>

                            <td className="p-3">
                              ₹{Number(sale.sellingPrice ?? 0)}
                            </td>

                            <td className="p-3 font-bold">
                              ₹{Number(sale.totalAmount ?? 0)}
                            </td>

                            <td className="p-3 text-gray-500">
                              {sale.saleDate
                                ? new Date(sale.saleDate).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" }
                                  )
                                : "-"}
                            </td>

                            <td className="p-3">
                              <button
                                onClick={() =>
                                  handleDeleteSale(sale._id, sale.productName)
                                }
                                title="Delete sale"
                                aria-label="Delete sale"
                                className="bg-red-500 hover:bg-red-600 active:scale-95 text-white p-1.5 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

              {salesTotalItems > SALES_PER_PAGE && (

                <div className="flex items-center justify-center gap-3 mt-6">

                  <button
                    onClick={() =>
                      setSalesPage((current) => Math.max(current - 1, 1))
                    }
                    disabled={safeSalesPage === 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  <span className="text-sm font-medium">
                    Page {safeSalesPage} of {salesTotalPages}
                  </span>

                  <button
                    onClick={() =>
                      setSalesPage((current) =>
                        Math.min(current + 1, salesTotalPages)
                      )
                    }
                    disabled={safeSalesPage === salesTotalPages}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>

                </div>

              )}

            </div>

            {/* ---------------- MONTHLY REPORT (NEW) ---------------- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">

                <div>

                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    Monthly Report
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Poore mahine ka hisaab
                  </p>

                </div>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="border border-gray-300 p-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />

              </div>

              {monthlyLoading ? (

                <div className="border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-500 text-sm">Loading report...</p>
                </div>

              ) : (

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <p className="text-xs text-gray-500">Selling Total</p>
                    <p className="font-bold text-blue-700 mt-1">
                      ₹{monthly.totalRevenue}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                    <p className="text-xs text-gray-500">Cost Total</p>
                    <p className="font-bold text-red-700 mt-1">
                      ₹{monthly.totalCost}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-center">
                    <p className="text-xs text-gray-500">Profit</p>
                    <p className="font-bold text-green-700 mt-1">
                      ₹{monthly.profit}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                    <p className="text-xs text-gray-500">Units Sold</p>
                    <p className="font-bold text-amber-700 mt-1">
                      {monthly.totalUnits}
                    </p>
                  </div>

                </div>

              )}

            </div>

          </section>

        )}

      </main>

      {/* =====================================================
          EDIT MODAL (NEW)
      ===================================================== */}
      {editingProduct && (

        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
          onClick={closeEdit}
        >

          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-3"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="flex items-start justify-between gap-3">

              <div className="min-w-0">

                <h3 className="font-bold text-gray-800 break-words">
                  {editingProduct.name}
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Abhi stock: {Number(editingProduct.quantity ?? 0)} pcs
                </p>

              </div>

              <button
                onClick={closeEdit}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <div>

              <label className="text-xs font-semibold text-gray-600">
                Nayi quantity add karo
              </label>

              <input
                type="number"
                min="0"
                step="1"
                placeholder="Jaise 10"
                value={editForm.addQuantity}
                onChange={(event) =>
                  setEditForm({ ...editForm, addQuantity: event.target.value })
                }
                className="w-full mt-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div>

                <label className="text-xs font-semibold text-gray-600">
                  Cost Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.costPrice}
                  onChange={(event) =>
                    setEditForm({ ...editForm, costPrice: event.target.value })
                  }
                  className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

              </div>

              <div>

                <label className="text-xs font-semibold text-gray-600">
                  Selling Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.sellingPrice}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      sellingPrice: event.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

              </div>

            </div>

            <div className="flex gap-2 pt-1">

              <button
                onClick={handleUpdateProduct}
                disabled={savingEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                {savingEdit ? "Saving..." : "Update"}
              </button>

              <button
                onClick={closeEdit}
                className="flex-1 bg-gray-200 hover:bg-gray-300 font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;