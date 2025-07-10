import React, { useEffect, useState } from "react";
import UserLayout from "../layout/UserLayout";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [listed, setListed] = useState({});
    const [selected, setSelected] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [predictingId, setPredictingId] = useState(null);
    const [predictedPrices, setPredictedPrices] = useState({});

    useEffect(() => {
        fetch("http://localhost:8000/products")
            .then((res) => res.json())
            .then((data) => setProducts(data || []));
    }, []);

    const capitalize = (str) =>
        str
            .replace(/_/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

    const renderValue = (val) => {
        if (typeof val === "string" || typeof val === "number") return val;

        if (
            Array.isArray(val) &&
            val.length &&
            typeof val[0] === "object" &&
            "Name" in val[0] &&
            "Values" in val[0]
        ) {
            return val.map((opt) => `${opt.Name}: ${opt.Values.join(", ")}`).join(" | ");
        }

        if (Array.isArray(val)) return val.join(", ");

        if (typeof val === "object" && val !== null) {
            return Object.entries(val)
                .map(([k, v]) => `${capitalize(k)}: ${renderValue(v)}`)
                .join("\n");
        }

        return "";
    };

    const extractStructuredData = (desc) => {
        return desc?.["Structured Data"] || desc?.structured_data || desc || {};
    };

    const handleListProduct = async (product, index) => {
        setLoadingId(index);
        try {
            const res = await fetch("http://localhost:8000/list-on-shopify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(product),
            });

            if (!res.ok) throw new Error("Failed to list product");
            setListed((prev) => ({ ...prev, [index]: true }));
        } catch (err) {
            alert("❌ Failed to list on Shopify. Check logs.");
            console.error(err);
        } finally {
            setLoadingId(null);
        }
    };

    const handlePredictPrice = async (product, index) => {
        setPredictingId(index);
        try {
            const res = await fetch("http://localhost:8000/predict-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(product),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Prediction failed");

            setPredictedPrices((prev) => ({
                ...prev,
                [index]: data.data.suggested_price,
            }));
        } catch (err) {
            alert("❌ Failed to predict price.");
            console.error(err);
        } finally {
            setPredictingId(null);
        }
    };

    const advertiseProduct = async (product, index) => {
    try {
        const structured = product?.description?.structured_data || {};

        const payload = {
            title: structured.title || "Untitled",
            image_url: product.images[0],
            color: structured.color || "N/A",
            material: structured.material || "N/A",
            size: structured.size || "N/A",
            price: structured.price || "N/A",
        };

        const res = await fetch("http://localhost:8000/scrape-store-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to trigger advertising");
        alert("✅ Advertisement started. Check backend logs.");
    } catch (err) {
        alert("❌ Failed to advertise.");
        console.error(err);
    }
};

    return (
        <UserLayout>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: "#333" }}>All Products</h1>

            <div
                style={{
                    marginTop: 20,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 20,
                }}
            >
                {products.map((product, index) => {
                    const structured = extractStructuredData(product.description);
                    const isListed = listed[index];
                    const predicted = predictedPrices[index];

                    return (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                height: 460,
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: 12,
                                backgroundColor: "#fff",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                cursor: "pointer",
                            }}
                            onClick={() => setSelected(product)}
                        >
                            <img
                                src={product.images[0]}
                                alt="product"
                                style={{
                                    width: "100%",
                                    height: 240,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                }}
                            />
                            <div style={{ marginTop: 10, flexGrow: 1 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#2c3e50" }}>
                                    {structured.title || "Untitled Product"}
                                </h3>
                                <p
                                    style={{
                                        fontSize: 13,
                                        color: "#555",
                                        marginBottom: 10,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    {structured.description || "No description"}
                                </p>
                                {predicted && (
                                    <p style={{ fontSize: 13, color: "#2c3e50", fontWeight: 500 }}>
                                        🔮 Predicted Price: ₹{predicted}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        backgroundColor: isListed ? "#ccc" : "#27ae60",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        cursor: isListed ? "not-allowed" : "pointer",
                                        fontWeight: 500,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isListed) handleListProduct(product, index);
                                    }}
                                    disabled={isListed || loadingId === index}
                                >
                                    {isListed
                                        ? "✅ Listed"
                                        : loadingId === index
                                            ? "Listing..."
                                            : "List on Shopify"}
                                </button>
                                  
                                <button
                                    style={{
                                        flex: 1,
                                        padding: "8px 12px",
                                        backgroundColor: "#f39c12",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 6,
                                        fontSize: 14,
                                        cursor: "pointer",
                                        fontWeight: 500,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        advertiseProduct(product, index);
                                    }}
                                >
                                    Advertise
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selected && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 999,
                    }}
                    onClick={() => setSelected(null)}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            padding: 24,
                            borderRadius: 12,
                            maxWidth: 800,
                            width: "90%",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            position: "relative",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            style={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                background: "#dc3545",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "6px 10px",
                                cursor: "pointer",
                            }}
                            onClick={() => setSelected(null)}
                        >
                            Close
                        </button>

                        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20 }}>
                            {selected.images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt={`Slide ${i}`}
                                    style={{
                                        width: 180,
                                        height: 180,
                                        objectFit: "cover",
                                        borderRadius: 8,
                                        border: "1px solid #ccc",
                                    }}
                                />
                            ))}
                        </div>

                        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Product Details</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {Object.entries(extractStructuredData(selected.description)).map(
                                ([key, value], idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            gap: 8,
                                            alignItems: "flex-start",
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <label style={{ minWidth: 140, fontWeight: 600, color: "#2e2e2e" }}>
                                            {capitalize(key)}:
                                        </label>
                                        <div style={{ flex: 1, whiteSpace: "pre-wrap", color: "#555" }}>
                                            {renderValue(value)}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </UserLayout>
    );
}
