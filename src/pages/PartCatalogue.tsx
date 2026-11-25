import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Package,
  Search,
  ShoppingCart,
  Image as ImageIcon,
} from "lucide-react";
import "../css/PartCatalogue.css";

const API_BASE = "http://localhost:5000/api";

interface Part {
  id: number;
  part_number: string;
  oem_part_number: string | null;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number;
  vat_rate: number;
  unit_of_measure: string;
  barcode: string | null;
  is_active: boolean;
  category_id: number;
  category_name: string;
  brand_id: number | null;
  brand_name: string | null;
  quantity_on_hand: number;
  minimum_stock_level: number;
  location: string | null;
  image_url: string | null;
  file_name: string | null;
  alt_text: string | null;
}

interface PartCategory {
  id: number;
  name: string;
  description: string | null;
}

interface VehicleSearchFilter {
  variantId: number;
  year: number;
}

interface PartCatalogueProps {
  categoryName: string;
  vehicleFilter?: VehicleSearchFilter;
  onBack: () => void;
}

export function PartCatalogue({
  categoryName,
  vehicleFilter,
  onBack,
}: PartCatalogueProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryAndParts() {
      try {
        setLoading(true);
        setError("");
        setParts([]);

        // Retrieve the available categories from PostgreSQL.
        const categoryResponse = await fetch(
          `${API_BASE}/parts/categories`
        );

        if (!categoryResponse.ok) {
          throw new Error("Failed to load categories.");
        }

        const categories: PartCategory[] =
          await categoryResponse.json();

        if (cancelled) return;

        // Check whether the user selected a specific category.
        const isAllDepartments =
          categoryName.trim().toLowerCase() === "all departments";

        let selectedCategory: PartCategory | undefined;

        if (!isAllDepartments) {
          selectedCategory = categories.find(
            (item) =>
              item.name.trim().toLowerCase() ===
              categoryName.trim().toLowerCase()
          );

          // Stop if the selected category does not exist.
          if (!selectedCategory) {
            setParts([]);
            return;
          }
        }
        // Build the parts request.
        const params = new URLSearchParams();

        // Apply the selected category unless All Departments was selected.
        if (selectedCategory) {
          params.append(
            "categoryId",
            String(selectedCategory.id)
          );
        }

        // Apply the vehicle compatibility filters when supplied.
        if (vehicleFilter) {
          params.append(
            "variantId",
            String(vehicleFilter.variantId)
          );

          params.append(
            "year",
            String(vehicleFilter.year)
          );
        }

        const partsResponse = await fetch(
          `${API_BASE}/parts?${params.toString()}`
        );

        if (!partsResponse.ok) {
          throw new Error("Failed to load parts.");
        }

        const data: {
          success: boolean;
          count: number;
          parts: Part[];
        } = await partsResponse.json();

        if (!cancelled) {
          setParts(data.parts || []);
        }
      } catch (error) {
        console.error("Loading catalogue failed:", error);

        if (!cancelled) {
          setError(
            "Unable to load catalogue from the server. Please check that the backend is running."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCategoryAndParts();

    return () => {
      cancelled = true;
    };
  }, [
    categoryName,
    vehicleFilter?.variantId,
    vehicleFilter?.year,
  ]);

  // Search parts by name, part number, OEM number or brand.
  const filteredParts = parts.filter((part) => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return true;
    }

    return (
      (part.name || "").toLowerCase().includes(searchText) ||
      (part.part_number || "").toLowerCase().includes(searchText) ||
      (part.oem_part_number || "").toLowerCase().includes(searchText) ||
      (part.brand_name || "").toLowerCase().includes(searchText)
    );
  });

  const formatPrice = (price: number) => {
    return `R ${Number(price || 0).toFixed(2)}`;
  };

  return (
    <div className="part-catalogue-page">
      {/* Catalogue header */}
      <div className="part-catalogue-header">
        <button
          type="button"
          onClick={onBack}
          className="pc-back-button"
        >
          <ArrowLeft size={18} />
          <span>Back to Vehicle Search</span>
        </button>

        <div className="pc-title-area">
          <div className="pc-title-icon">
            <Package size={24} />
          </div>

          <div>
            <p className="pc-eyebrow">PARTS CATALOGUE</p>
            <h1>{categoryName}</h1>
            <p>
              Browse all {categoryName.toLowerCase()} available in the
              store.
            </p>
          </div>
        </div>
        <div className="pc-cart-button">
          <ShoppingCart size={19} />
          <span>Cart</span>
          <span className="pc-cart-count">0</span>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="part-catalogue-toolbar">
        <div className="pc-search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder={`Search ${categoryName.toLowerCase()}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="pc-result-count">
          {loading
            ? "Loading..."
            : `${filteredParts.length} part${
                filteredParts.length === 1 ? "" : "s"
              }`}
        </div>
      </div>

      {/* Selected vehicle information */}
      {vehicleFilter && (
        <div className="pc-vehicle-filter">
          Showing parts compatible with the selected vehicle
          (Variant ID: {vehicleFilter.variantId}, Year:{" "}
          {vehicleFilter.year})
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="pc-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="pc-empty-state">
          <Package size={42} />
          <h2>Loading parts...</h2>
          <p>Getting the latest catalogue information.</p>
        </div>
      ) : filteredParts.length === 0 ? (
        /* Empty state */
        <div className="pc-empty-state">
          <Package size={42} />

          <h2>
            {search
              ? "No matching parts found"
              : vehicleFilter
                ? "No compatible parts found"
                : `No ${categoryName.toLowerCase()} found`}
          </h2>

          <p>
            {search
              ? "Try a different search term."
              : vehicleFilter
                ? "There are currently no parts recorded for this vehicle, year and department."
                : "There are currently no parts in this department."}
          </p>
        </div>
      ) : (
        /* Product cards */
        <div className="pc-products-grid">
          {filteredParts.map((part) => (
            <article key={part.id} className="pc-product-card">
              <div className="pc-product-image">
                {part.image_url ? (
                  <img
  src={`http://localhost:5000${part.image_url}`}
  alt={part.alt_text || part.name}
  onError={(event) => {
    console.error("Image failed:", event.currentTarget.src);
  }}
/>
                ) : (
                  <div className="pc-no-image">
                    <ImageIcon size={42} />
                    <span>No image</span>
                  </div>
                )}
              </div>

              <div className="pc-product-content">
                <div className="pc-product-category">
                  {part.category_name}
                </div>

                <h2>{part.name}</h2>

                {part.brand_name && (
                  <div className="pc-brand">
                    {part.brand_name}
                  </div>
                )}

                {part.description && (
                  <p className="pc-description">
                    {part.description}
                  </p>
                )}
                <div className="pc-part-number">
                  <span>Part No.</span>
                  <strong>{part.part_number}</strong>
                </div>

                {part.oem_part_number && (
                  <div className="pc-oem-number">
                    <span>OEM</span>
                    <strong>{part.oem_part_number}</strong>
                  </div>
                )}

                <div className="pc-product-bottom">
                  <div>
                    <div className="pc-price">
                      {formatPrice(part.selling_price)}
                    </div>

                    <div
                      className={`pc-stock ${
                        part.quantity_on_hand > 0
                          ? "in-stock"
                          : "out-of-stock"
                      }`}
                    >
                      {part.quantity_on_hand > 0
                        ? `${part.quantity_on_hand} in stock`
                        : "Out of stock"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pc-add-cart-button"
                    disabled={part.quantity_on_hand <= 0}
                  >
                    <ShoppingCart size={16} />
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default PartCatalogue;