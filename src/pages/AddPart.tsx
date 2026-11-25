
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";

import {
  ArrowLeft,
  ImagePlus,
  PackagePlus,
  Save,
  X,
  Plus,
  Car,
  Trash2,
} from "lucide-react";

import "../css/AddPart.css";

const API_BASE = "http://localhost:5000/api";

// =============================================
// INTERFACES
// =============================================

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Brand {
  id: number;
  name: string;
}

interface VehicleMake {
  id: number;
  name: string;
  code: string | null;
}

interface VehicleModel {
  id: number;
  make_id: number;
  name: string;
  code: string | null;
}

interface VehicleGeneration {
  id: number;
  model_id: number;
  generation_name: string;
  platform_code: string | null;
  year_start: number | null;
  year_end: number | null;
}

interface VehicleVariant {
  id: number;
  generation_id: number;
  variant_name: string;
  body_style: string | null;
  doors: number | null;
  start_year: number | null;
  end_year: number | null;
  generation_name?: string | null;
  generation_code?: string | null;
}

interface CompatibleVehicle {
  variant_id: number;
  model_year: number;
  engine_id: null;
  display_name: string;
}

interface AddPartProps {
  onBack: () => void;
  onSaved?: () => void;
}

// =============================================
// INITIAL FORM VALUES
// =============================================

const initialForm = {
  part_number: "",
  oem_part_number: "",
  name: "",
  description: "",
  category_id: "",
  brand_id: "",
  cost_price: "",
  selling_price: "",
  vat_rate: "15",
  unit_of_measure: "Each",
  barcode: "",
  quantity_on_hand: "0",
  minimum_stock_level: "0",
  location: "",
};

// =============================================
// GENERIC API FETCH FUNCTION
// =============================================

async function fetchOptions<T>(url: string): Promise<T[]> {
  const response = await fetch(url);

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || "Could not load information."
    );
  }

  // Support APIs returning either an array directly
  // or an object containing the requested array.

  if (Array.isArray(result)) {
    return result as T[];
  }

  if (Array.isArray(result.variants)) {
    return result.variants as T[];
  }

  if (Array.isArray(result.generations)) {
  return result.generations as T[];
}

  if (Array.isArray(result.models)) {
    return result.models as T[];
  }

  if (Array.isArray(result.makes)) {
    return result.makes as T[];
  }

  if (Array.isArray(result.categories)) {
    return result.categories as T[];
  }

  if (Array.isArray(result.brands)) {
    return result.brands as T[];
  }

  return [];
}

// =============================================
// ADD PART COMPONENT
// =============================================

export default function AddPart({
  onBack,
  onSaved,
}: AddPartProps) {
  // =============================================
  // PRODUCT INFORMATION
  // =============================================

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState(initialForm);

  // =============================================
  // PRODUCT IMAGE
  // =============================================

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (!imagePreview) return;

    return () => {
      URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // =============================================
  // VEHICLE DATA
  // =============================================

 const [makes, setMakes] = useState<VehicleMake[]>([]);
const [models, setModels] = useState<VehicleModel[]>([]);
const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
const [variants, setVariants] = useState<VehicleVariant[]>([]);

  // =============================================
  // VEHICLE SELECTION
  // =============================================

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // =============================================
  // COMPATIBLE VEHICLES
  // =============================================

  const [compatibleVehicles, setCompatibleVehicles] =
    useState<CompatibleVehicle[]>([]);

  // =============================================
  // LOADING STATES
  // =============================================

  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // =============================================
  // MESSAGES
  // =============================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =============================================
  // LOAD CATEGORIES, BRANDS AND MAKES
  // =============================================

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setError("");

        const [categoryData, brandData, makeData] =
          await Promise.all([
            fetchOptions<Category>(
              `${API_BASE}/parts/categories`
            ),
            fetchOptions<Brand>(
              `${API_BASE}/parts/brands`
            ),
            fetchOptions<VehicleMake>(
              `${API_BASE}/vehicles/makes`
            ),
          ]);

        if (!active) return;

        setCategories(categoryData);
        setBrands(brandData);
        setMakes(makeData);
      } catch (err) {
        if (!active) return;

        console.error("Loading form options failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load form options."
        );
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  // =============================================
  // LOAD MODELS WHEN MAKE CHANGES
  // =============================================

  useEffect(() => {
    let active = true;

    setModels([]);
    setSelectedModel("");

setGenerations([]);
    setVariants([]);
    setSelectedVariant("");
    setSelectedYear("");

    if (!selectedMake) {
      setLoadingModels(false);
      return;
    }

    async function loadModels() {
      try {
        setLoadingModels(true);

        const data = await fetchOptions<VehicleModel>(
          `${API_BASE}/vehicles/models?makeId=${selectedMake}`
        );

        if (active) {
          setModels(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load vehicle models."
          );
        }
      } finally {
        if (active) {
          setLoadingModels(false);
        }
      }
    }

    loadModels();

    return () => {
      active = false;
    };
  }, [selectedMake]);

  // =============================================
// LOAD VARIANTS USING THE SAME LOGIC AS PART SEARCH
// =============================================

useEffect(() => {
  let active = true;

  setVariants([]);
  setSelectedVariant("");
  setSelectedYear("");

  if (!selectedModel) {
    setLoadingVariants(false);
    return;
  }

  async function loadVariants() {
    try {
      setLoadingVariants(true);
      setError("");

      // First retrieve generations exactly as Part Search does.
      const generationData =
  await fetchOptions<VehicleGeneration>(
    `${API_BASE}/vehicles/generations?modelId=${selectedModel}`
  );

if (!active) return;

setGenerations(generationData);

      // Match Part Search: use only the first generation.
      const firstGeneration = generationData[0];

      if (!firstGeneration) {
        setVariants([]);
        return;
      }

      // Load variants belonging to that generation only.
      const variantData =
        await fetchOptions<VehicleVariant>(
          `${API_BASE}/vehicles/variants?generationId=${firstGeneration.id}`
        );

      if (active) {
        setVariants(variantData);
      }
    } catch (err) {
      if (active) {
        console.error("Loading variants failed:", err);

        setVariants([]);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load vehicle variants."
        );
      }
    } finally {
      if (active) {
        setLoadingVariants(false);
      }
    }
  }

  loadVariants();

  return () => {
    active = false;
  };
}, [selectedModel]);

  // =============================================
  // VALID YEARS FOR SELECTED VARIANT
  // =============================================

  // =============================================
// AVAILABLE YEARS - SAME LOGIC AS PART SEARCH
// =============================================

const availableYears = useMemo(() => {
  if (generations.length === 0) {
    return [];
  }

  const currentYear = 2026;

  const startYears = generations.map(
    (generation) => generation.year_start ?? 2005
  );

  const endYears = generations.map(
    (generation) => generation.year_end ?? currentYear
  );

  const firstYear = Math.min(...startYears);
  const lastYear = Math.max(...endYears);

  return Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index
  );
}, [generations]);


  // =============================================
  // GENERAL FORM CHANGE
  // =============================================

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  // =============================================
  // ADD COMPATIBLE VEHICLE
  // =============================================

  function addCompatibleVehicle() {
    setError("");
    setSuccess("");

    if (
      !selectedMake ||
      !selectedModel ||
      !selectedVariant ||
      !selectedYear
    ) {
      setError(
        "Please select a make, model, variant and year."
      );
      return;
    }

    const make = makes.find(
      (item) => item.id === Number(selectedMake)
    );

    const model = models.find(
      (item) => item.id === Number(selectedModel)
    );

    const variant = variants.find(
      (item) => item.id === Number(selectedVariant)
    );

    if (!make || !model || !variant) {
      setError(
        "Could not identify the selected vehicle. Please try again."
      );
      return;
    }

    const year = Number(selectedYear);

    if (!availableYears.includes(year)) {
      setError(
        "The selected year is not valid for this vehicle variant."
      );
      return;
    }

    // Prevent the same variant and year being added twice.

    const duplicate = compatibleVehicles.some(
      (item) =>
        item.variant_id === variant.id &&
        item.model_year === year
    );

    if (duplicate) {
      setError(
        "This vehicle variant and year have already been added."
      );
      return;
    }

    // Display the vehicle without exposing generation
// or body-style information in the selection summary.

   const displayName = [
  make.name,
  model.name,
  variant.variant_name,
  String(year),
]
  .filter(Boolean)
  .join(" ");

    setCompatibleVehicles((previous) => [
      ...previous,
      {
        variant_id: variant.id,
        model_year: year,
        engine_id: null,
        display_name: displayName,
      },
    ]);

    // Clear selections so another vehicle can be added.

    setSelectedMake("");
    setSelectedModel("");
    setSelectedVariant("");
    setSelectedYear("");

    setSuccess("");
  }

  // =============================================
  // REMOVE COMPATIBLE VEHICLE
  // =============================================

  function removeCompatibleVehicle(index: number) {
    setCompatibleVehicles((previous) =>
      previous.filter(
        (_, currentIndex) => currentIndex !== index
      )
    );

    setSuccess("");
  }

  // =============================================
  // IMAGE HANDLING
  // =============================================

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError("");

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "Invalid image format. Please upload PNG, JPG or WEBP."
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("The image must be smaller than 5 MB.");

      event.target.value = "";
      return;
    }

    setImage(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  }

  // =============================================
  // REMOVE IMAGE
  // =============================================

  function removeImage() {
    setImage(null);
    setImagePreview("");
  }

  // =============================================
  // RESET FORM AFTER SUCCESSFUL SAVE
  // =============================================

  function resetProductForm() {
    setForm({ ...initialForm });

    setCompatibleVehicles([]);

    setSelectedMake("");
    setSelectedModel("");
    setSelectedVariant("");
    setSelectedYear("");

    setModels([]);
    setVariants([]);

    removeImage();
  }

 
  // =============================================
  // VALIDATE PRODUCT FORM
  // =============================================

  function validateForm(): boolean {
    if (!form.category_id) {
      setError("Please select a department.");
      return false;
    }

    if (!form.part_number.trim()) {
      setError("Part number is required.");
      return false;
    }

    if (!form.name.trim()) {
      setError("Product name is required.");
      return false;
    }

    if (compatibleVehicles.length === 0) {
      setError(
        "Please add at least one compatible vehicle before saving."
      );
      return false;
    }

    if (
      form.cost_price === "" ||
      !Number.isFinite(Number(form.cost_price)) ||
      Number(form.cost_price) < 0
    ) {
      setError("Please enter a valid cost price.");
      return false;
    }

    if (
      form.selling_price === "" ||
      !Number.isFinite(Number(form.selling_price)) ||
      Number(form.selling_price) < 0
    ) {
      setError("Please enter a valid selling price.");
      return false;
    }

    if (
      form.vat_rate === "" ||
      !Number.isFinite(Number(form.vat_rate)) ||
      Number(form.vat_rate) < 0 ||
      Number(form.vat_rate) > 100
    ) {
      setError("VAT rate must be between 0 and 100.");
      return false;
    }

    if (
      form.quantity_on_hand === "" ||
      !Number.isFinite(Number(form.quantity_on_hand)) ||
      Number(form.quantity_on_hand) < 0
    ) {
      setError("Please enter a valid opening stock quantity.");
      return false;
    }

    if (!Number.isInteger(Number(form.quantity_on_hand))) {
      setError("Opening stock quantity must be a whole number.");
      return false;
    }

    if (
      form.minimum_stock_level === "" ||
      !Number.isFinite(Number(form.minimum_stock_level)) ||
      Number(form.minimum_stock_level) < 0
    ) {
      setError("Please enter a valid minimum stock level.");
      return false;
    }

    if (!Number.isInteger(Number(form.minimum_stock_level))) {
      setError("Minimum stock level must be a whole number.");
      return false;
    }

    return true;
  }

  // =============================================
  // SAVE PRODUCT
  // =============================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    data.set("part_number", form.part_number.trim());
    data.set("name", form.name.trim());
    data.set("oem_part_number", form.oem_part_number.trim());
    data.set("barcode", form.barcode.trim());

    // Send the selected variant and exact model year.
    // Engine is deliberately null because the form
    // no longer asks the user to select an engine.

    data.append(
      "compatible_vehicles",
      JSON.stringify(
        compatibleVehicles.map((vehicle) => ({
          variant_id: vehicle.variant_id,
          model_year: vehicle.model_year,
          engine_id: null,
        }))
      )
    );

    if (image) {
      data.append("image", image);
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/parts`,
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save the product."
        );
      }

      setSuccess(
        "Product and vehicle compatibility saved successfully."
      );

      resetProductForm();

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error("Saving product failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  // =============================================
  // PAGE STARTS
  // =============================================

  return (
    <div className="add-part-page">
      {/* ======================================
          PAGE HEADER
      ====================================== */}

      <div className="add-part-header">
        <button
          type="button"
          className="ap-back-button"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="ap-heading">
          <div className="ap-heading-icon">
            <PackagePlus size={25} />
          </div>

          <div>
            <p className="ap-eyebrow">
              PRODUCT MANAGEMENT
            </p>

            <h1>Add New Part</h1>

            <p>
              Register a spare part in your inventory catalogue.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          ERROR MESSAGE
      ====================================== */}

      {error && (
        <div
          className="ap-message ap-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ======================================
          SUCCESS MESSAGE
      ====================================== */}

      {success && (
        <div
          className="ap-message ap-success"
          role="status"
        >
          {success}
        </div>
      )}

      {/* ======================================
          LOADING OPTIONS
      ====================================== */}

      {loadingOptions ? (
        <div className="ap-loading">
          Loading departments, brands and vehicle information...
        </div>
      ) : (
        <form
          className="add-part-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* ==================================
              01 PRODUCT DETAILS
          ================================== */}

          <section className="ap-section">
            <div className="ap-section-heading">
              <span>01</span>

              <div>
                <h2>Department and Product Details</h2>
                <p>
                  Enter the product identification information.
                </p>
              </div>
            </div>

            <div className="ap-form-grid">
              {/* DEPARTMENT */}

              <label className="ap-field">
                <span>Department *</span>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select department</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* BRAND */}

              <label className="ap-field">
                <span>Product Brand</span>

                <select
                  name="brand_id"
                  value={form.brand_id}
                  onChange={handleChange}
                >
                  <option value="">Select brand (optional)</option>

                  {brands.map((brand) => (
                    <option
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* PART NUMBER */}

              <label className="ap-field">
                <span>Part Number *</span>

                <input
                  name="part_number"
                  value={form.part_number}
                  onChange={handleChange}
                  placeholder="Enter part number"
                  required
                />
              </label>

              {/* OEM NUMBER */}

              <label className="ap-field">
                <span>OEM Part Number</span>

                <input
                  name="oem_part_number"
                  value={form.oem_part_number}
                  onChange={handleChange}
                  placeholder="Enter OEM number"
                />
              </label>

              {/* PRODUCT NAME */}

              <label className="ap-field ap-full-width">
                <span>Product Name *</span>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Front Brake Pad Set"
                  required
                />
              </label>

              {/* DESCRIPTION */}

              <label className="ap-field ap-full-width">
                <span>Description</span>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter product description and relevant details..."
                  rows={3}
                />
              </label>

              {/* BARCODE */}

              <label className="ap-field">
                <span>Barcode</span>

                <input
                  name="barcode"
                  value={form.barcode}
                  onChange={handleChange}
                  placeholder="Enter barcode"
                />
              </label>

              {/* UNIT OF MEASURE */}

              <label className="ap-field">
                <span>Unit of Measure</span>

                <select
                  name="unit_of_measure"
                  value={form.unit_of_measure}
                  onChange={handleChange}
                >
                  <option value="Each">Each</option>
                  <option value="Pair">Pair</option>
                  <option value="Set">Set</option>
                  <option value="Kit">Kit</option>
                  <option value="Litre">Litre</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Box">Box</option>
                </select>
              </label>
            </div>
          </section>

          
          {/* ==================================
              02 VEHICLE COMPATIBILITY
          ================================== */}

          <section className="ap-section">
            <div className="ap-section-heading">
              <span>02</span>

              <div>
                <h2>Vehicle Compatibility</h2>

                <p>
                  Select all vehicles that this spare part fits.
                </p>
              </div>
            </div>

            <div className="ap-vehicle-intro">
              <Car size={21} />

              <div>
                <strong>
                  Which vehicles use this part?
                </strong>

                <p>
                  Select the make, model, variant and year.
                  You can add multiple compatible vehicles.
                </p>
              </div>
            </div>

            <div className="ap-form-grid ap-vehicle-grid">
              {/* VEHICLE MAKE */}

              <label className="ap-field">
                <span>Vehicle Make *</span>

                <select
                  value={selectedMake}
                  onChange={(event) => {
                    setSelectedMake(event.target.value);
                    setError("");
                  }}
                  disabled={loadingOptions}
                >
                  <option value="">Select make</option>

                  {makes.map((make) => (
                    <option
                      key={make.id}
                      value={make.id}
                    >
                      {make.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* VEHICLE MODEL */}

              <label className="ap-field">
                <span>Vehicle Model *</span>

                <select
                  value={selectedModel}
                  onChange={(event) => {
                    setSelectedModel(event.target.value);
                    setError("");
                  }}
                  disabled={!selectedMake || loadingModels}
                >
                  <option value="">
                    {loadingModels
                      ? "Loading models..."
                      : "Select model"}
                  </option>

                  {models.map((model) => (
                    <option
                      key={model.id}
                      value={model.id}
                    >
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* VEHICLE VARIANT */}

              <label className="ap-field">
                <span>Vehicle Variant *</span>

                <select
                  value={selectedVariant}
                  onChange={(event) => {
                    setSelectedVariant(event.target.value);
                    setSelectedYear("");
                    setError("");
                  }}
                  disabled={!selectedModel || loadingVariants}
                >
                  <option value="">
                    {loadingVariants
                      ? "Loading variants..."
                      : "Select variant"}
                  </option>

                  {variants.map((variant) => (
                    <option
                      key={variant.id}
                      value={variant.id}
                    >
                      {variant.variant_name}
                    </option>
                  ))}
                </select>

                {selectedModel &&
                  !loadingVariants &&
                  variants.length === 0 && (
                    <small className="ap-field-help">
                      No variants were returned for this model.
                      Check the vehicle variants API.
                    </small>
                  )}
              </label>

              {/* VEHICLE YEAR */}

              <label className="ap-field">
                <span>Year *</span>

                <select
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(event.target.value);
                    setError("");
                  }}
                  disabled={
                    !selectedVariant ||
                    availableYears.length === 0
                  }
                >
                  <option value="">
                    {!selectedVariant
                      ? "Select a variant first"
                      : availableYears.length === 0
                        ? "No year range available"
                        : "Select year"}
                  </option>

                  {availableYears.map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>

                {selectedVariant &&
                  availableYears.length === 0 && (
                    <small className="ap-field-help">
                      This variant has no starting year recorded.
                      Add its year range in the vehicle database.
                    </small>
                  )}
              </label>
            </div>

            {/* ADD COMPATIBLE VEHICLE BUTTON */}

            <div className="ap-add-vehicle-action">
              <button
                type="button"
                className="ap-add-vehicle-button"
                onClick={addCompatibleVehicle}
                disabled={
                  !selectedMake ||
                  !selectedModel ||
                  !selectedVariant ||
                  !selectedYear ||
                  loadingModels ||
                  loadingVariants ||
                  availableYears.length === 0
                }
              >
                <Plus size={17} />
                Add Compatible Vehicle
              </button>
            </div>

            {/* SELECTED COMPATIBLE VEHICLES */}

            <div className="ap-compatible-list">
              <div className="ap-compatible-heading">
                <h3>Selected Compatible Vehicles</h3>

                <span>
                  {compatibleVehicles.length} selected
                </span>
              </div>

              {compatibleVehicles.length === 0 ? (
                <div className="ap-empty-vehicles">
                  <Car size={27} />

                  <p>No vehicles added yet.</p>

                  <small>
                    Select a make, model, variant and year,
                    then click Add Compatible Vehicle.
                  </small>
                </div>
              ) : (
                <div className="ap-compatible-items">
                  {compatibleVehicles.map(
                    (vehicle, index) => (
                      <div
                        className="ap-compatible-item"
                        key={`${vehicle.variant_id}-${vehicle.model_year}`}
                      >
                        <div className="ap-compatible-icon">
                          <Car size={19} />
                        </div>

                        <div className="ap-compatible-info">
                          <strong>
                            {vehicle.display_name}
                          </strong>

                          <span>
                            Model year: {vehicle.model_year}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="ap-delete-vehicle"
                          onClick={() =>
                            removeCompatibleVehicle(index)
                          }
                          aria-label="Remove compatible vehicle"
                          title="Remove vehicle"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

         
          {/* ==================================
              03 PRICING INFORMATION
          ================================== */}

          <section className="ap-section">
            <div className="ap-section-heading">
              <span>03</span>

              <div>
                <h2>Pricing Information</h2>

                <p>
                  Set the product's cost and selling prices.
                </p>
              </div>
            </div>

            <div className="ap-form-grid ap-three-columns">
              {/* COST PRICE */}

              <label className="ap-field">
                <span>Cost Price (R) *</span>

                <input
                  type="number"
                  name="cost_price"
                  value={form.cost_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </label>

              {/* SELLING PRICE */}

              <label className="ap-field">
                <span>Selling Price (R) *</span>

                <input
                  type="number"
                  name="selling_price"
                  value={form.selling_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </label>

              {/* VAT */}

              <label className="ap-field">
                <span>VAT Rate (%)</span>

                <input
                  type="number"
                  name="vat_rate"
                  value={form.vat_rate}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              04 INITIAL STOCK
          ================================== */}

          <section className="ap-section">
            <div className="ap-section-heading">
              <span>04</span>

              <div>
                <h2>Initial Stock</h2>

                <p>
                  Record the quantity currently available.
                </p>
              </div>
            </div>

            <div className="ap-form-grid ap-three-columns">
              {/* OPENING QUANTITY */}

              <label className="ap-field">
                <span>Opening Quantity *</span>

                <input
                  type="number"
                  name="quantity_on_hand"
                  value={form.quantity_on_hand}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                />
              </label>

              {/* MINIMUM STOCK LEVEL */}

              <label className="ap-field">
                <span>Minimum Stock Level</span>

                <input
                  type="number"
                  name="minimum_stock_level"
                  value={form.minimum_stock_level}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </label>

              {/* STORAGE LOCATION */}

              <label className="ap-field">
                <span>Storage Location</span>

                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Shelf A1"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              05 PRODUCT IMAGE
          ================================== */}

          <section className="ap-section">
            <div className="ap-section-heading">
              <span>05</span>

              <div>
                <h2>Product Image</h2>

                <p>
                  Upload a clear image of the spare part.
                </p>
              </div>
            </div>

            <div className="ap-image-area">
              {imagePreview ? (
                <div className="ap-image-preview">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    className="ap-remove-image"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    <X size={17} />
                  </button>

                  <p>{image?.name}</p>
                </div>
              ) : (
                <label className="ap-upload-box">
                  <ImagePlus size={34} />

                  <strong>Choose product image</strong>

                  <span>
                    PNG, JPG or WEBP · Maximum 5 MB
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </section>

          {/* ==================================
              FORM ACTIONS
          ================================== */}

          <div className="ap-form-actions">
            {/* CANCEL */}

            <button
              type="button"
              className="ap-cancel-button"
              onClick={onBack}
              disabled={loading}
            >
              Cancel
            </button>

            {/* SAVE PRODUCT */}

            <button
              type="submit"
              className="ap-save-button"
              disabled={loading || loadingOptions}
            >
              <Save size={18} />

              {loading
                ? "Saving Product..."
                : "Save Product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
