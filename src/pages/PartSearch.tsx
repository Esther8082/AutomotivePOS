import { useEffect, useMemo, useState } from "react";
import {
  Car,
  X,
  ArrowRight,
  Bookmark,
  LayoutGrid,
  Sparkles,
  Wrench,
  ShieldAlert,
  Cable,
  Snowflake,
  Cog,
  BatteryCharging,
  Gauge,
  RefreshCw,
  Wind,
  Filter,
  Droplets,
  Fuel,
  Layers,
  Square,
  Armchair,
  CircleDot,
  Compass,
  MoveVertical,
  HelpCircle,
} from "lucide-react";
import "../css/PartSearch.css";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface VehicleMake {
  id: number;
  name: string;
}

interface VehicleModel {
  id: number;
  name: string;
  make_id: number;
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
  year_start: number | null;
  year_end: number | null;
}

// Vehicle details passed to the catalogue.
export interface VehicleSearchFilter {
  variantId: number;
  year: number;
}

interface DepartmentItem {
  id: string;
  label: string;
  icon:
    | "all"
    | "accessories"
    | "body"
    | "brakes"
    | "cables"
    | "cooling"
    | "drivetrain"
    | "electrical"
    | "engine"
    | "enginedrive"
    | "exhaust"
    | "filters"
    | "fluids"
    | "fuel"
    | "gaskets"
    | "glass"
    | "internal"
    | "mountings"
    | "steering"
    | "suspension";
}

// --------------------------------------------------
// DEPARTMENTS
// --------------------------------------------------

const DEPARTMENTS: DepartmentItem[] = [
  { id: "all", label: "All Departments", icon: "all" },
  { id: "accessories", label: "Accessories", icon: "accessories" },
  { id: "body", label: "Body", icon: "body" },
  { id: "brakes", label: "Brakes", icon: "brakes" },
  { id: "control-cables", label: "Control Cables", icon: "cables" },
  { id: "cooling-ac", label: "Cooling/AC", icon: "cooling" },
  { id: "drive-train", label: "Drive Train", icon: "drivetrain" },
  { id: "electrical", label: "Electrical", icon: "electrical" },
  { id: "engine", label: "Engine", icon: "engine" },
  { id: "engine-drive", label: "Engine Drive", icon: "enginedrive" },
  { id: "exhaust-system", label: "Exhaust System", icon: "exhaust" },
  { id: "filters", label: "Filters", icon: "filters" },
  { id: "fluids", label: "Fluids", icon: "fluids" },
  { id: "fuel-system", label: "Fuel System", icon: "fuel" },
  { id: "gaskets", label: "Gaskets", icon: "gaskets" },
  { id: "glass", label: "Glass", icon: "glass" },
  { id: "internal", label: "Internal", icon: "internal" },
  { id: "mountings", label: "Mountings", icon: "mountings" },
  { id: "steering", label: "Steering", icon: "steering" },
  { id: "suspension", label: "Suspension", icon: "suspension" },
];

// These names must match the category names stored in PostgreSQL.
const DATABASE_CATEGORY_NAMES: Record<string, string> = {
  all: "All Departments",
  accessories: "Accessories",
  body: "Body",
  brakes: "Brakes",
  "control-cables": "Control Cables",
  "cooling-ac": "Cooling",
  "drive-train": "Drivetrain",
  electrical: "Electrical",
  engine: "Engine",
  "engine-drive": "Engine Drive",
  "exhaust-system": "Exhaust",
  filters: "Filters",
  fluids: "Fluids",
  "fuel-system": "Fuel System",
  gaskets: "Gaskets",
  glass: "Glass",
  internal: "Interior",
  mountings: "Mountings",
  steering: "Steering",
  suspension: "Suspension",
};

// --------------------------------------------------
// DEPARTMENT ICONS
// --------------------------------------------------

function DepartmentIcon({ type }: { type: DepartmentItem["icon"] }) {
  const props = { size: 28, strokeWidth: 1.6 };

  switch (type) {
    case "all":
      return <Wrench {...props} />;
    case "accessories":
      return <Sparkles {...props} />;
    case "body":
      return <Square {...props} />;
    case "brakes":
      return <CircleDot {...props} />;
    case "cables":
      return <Cable {...props} />;
    case "cooling":
      return <Snowflake {...props} />;
    case "drivetrain":
      return <Cog {...props} />;
    case "electrical":
      return <BatteryCharging {...props} />;
    case "engine":
      return <Gauge {...props} />;
    case "enginedrive":
      return <RefreshCw {...props} />;
    case "exhaust":
      return <Wind {...props} />;
    case "filters":
      return <Filter {...props} />;
    case "fluids":
      return <Droplets {...props} />;
    case "fuel":
      return <Fuel {...props} />;
    case "gaskets":
      return <Layers {...props} />;
    case "glass":
      return <ShieldAlert {...props} />;
    case "internal":
      return <Armchair {...props} />;
    case "mountings":
      return <Wrench {...props} />;
    case "steering":
      return <Compass {...props} />;
    case "suspension":
      return <MoveVertical {...props} />;
    default:
      return <Wrench {...props} />;
  }
}

// --------------------------------------------------
// COMPONENT PROPS
// --------------------------------------------------

interface PartSearchProps {
  onOpenCatalogue: (
    categoryId: string,
    categoryName: string,
    vehicleFilter?: VehicleSearchFilter
  ) => void;
}

// --------------------------------------------------
// PART SEARCH COMPONENT
// --------------------------------------------------

export function PartSearch({ onOpenCatalogue }: PartSearchProps) {
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [year, setYear] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [garageVehicles, setGarageVehicles] = useState<string[]>([]);

  // Vehicle database records
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);

  // Loading and error states
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [apiError, setApiError] = useState("");
  // --------------------------------------------------
  // LOAD VEHICLE MAKES
  // --------------------------------------------------

  useEffect(() => {
    async function loadMakes() {
      try {
        setLoadingMakes(true);
        setApiError("");

        const res = await fetch(
          "http://localhost:5000/api/vehicles/makes"
        );

        if (!res.ok) {
          throw new Error("Failed to load makes");
        }

        const data: VehicleMake[] = await res.json();
        setMakes(data);

        const vw = data.find(
          (m) => m.name.trim().toUpperCase() === "VOLKSWAGEN"
        );

        if (vw) {
          setMakeId(String(vw.id));
        }
      } catch (err) {
        console.error(err);
        setApiError("Unable to load vehicle makes from server.");
      } finally {
        setLoadingMakes(false);
      }
    }

    loadMakes();
  }, []);

  // --------------------------------------------------
  // LOAD VEHICLE MODELS
  // --------------------------------------------------

  useEffect(() => {
    if (!makeId) {
      setModels([]);
      return;
    }

    async function loadModels() {
      try {
        setLoadingModels(true);
        setApiError("");

        const res = await fetch(
          `http://localhost:5000/api/vehicles/models?makeId=${makeId}`
        );

        if (!res.ok) {
          throw new Error("Failed to load models");
        }

        const data: VehicleModel[] = await res.json();
        setModels(data);
      } catch (err) {
        console.error(err);
        setApiError("Unable to load vehicle models.");
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [makeId]);

  // --------------------------------------------------
  // LOAD VEHICLE GENERATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!modelId) {
      setGenerations([]);
      setVariants([]);
      return;
    }

    async function loadGenerations() {
      try {
        setLoadingGenerations(true);
        setApiError("");

        const res = await fetch(
          `http://localhost:5000/api/vehicles/generations?modelId=${modelId}`
        );

        if (!res.ok) {
          throw new Error("Failed to load generations");
        }

        const data: VehicleGeneration[] = await res.json();
        setGenerations(data);
      } catch (err) {
        console.error(err);
        setApiError("Unable to load years/generations.");
      } finally {
        setLoadingGenerations(false);
      }
    }

    loadGenerations();
  }, [modelId]);

  // --------------------------------------------------
  // LOAD VEHICLE VARIANTS
  // --------------------------------------------------

  useEffect(() => {
    if (!modelId) {
      setVariants([]);
      return;
    }

    const targetGenId = generations[0]?.id;

    if (!targetGenId) {
      setVariants([]);
      return;
    }

    async function loadVariants() {
      try {
        setLoadingVariants(true);
        setApiError("");

        const res = await fetch(
          `http://localhost:5000/api/vehicles/variants?generationId=${targetGenId}`
        );

        if (!res.ok) {
          throw new Error("Failed to load variants");
        }

        const data: VehicleVariant[] = await res.json();
        setVariants(data);
      } catch (err) {
        console.error(err);
        setApiError("Unable to load vehicle variants.");
      } finally {
        setLoadingVariants(false);
      }
    }

    loadVariants();
  }, [modelId, generations]);

  // --------------------------------------------------
  // YEAR OPTIONS
  // --------------------------------------------------

  const yearOptions = useMemo(() => {
    const yearsSet = new Set<string>();

    generations.forEach((g) => {
      const start = g.year_start || 2005;
      const end = g.year_end || 2026;

      for (let y = end; y >= start; y--) {
        yearsSet.add(String(y));
      }
    });

    return Array.from(yearsSet).sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [generations]);

  // --------------------------------------------------
  // SELECTION PROGRESS
  // --------------------------------------------------

  const selectedCount = [makeId, modelId, variantId, year].filter(
    Boolean
  ).length;

  const progressPercent = (selectedCount / 4) * 100;

  // --------------------------------------------------
  // CLEAR SELECTIONS
  // --------------------------------------------------

  const handleClearAll = () => {
    setMakeId("");
    setModelId("");
    setVariantId("");
    setYear("");

    setModels([]);
    setGenerations([]);
    setVariants([]);
  };

  const handleClearMake = () => {
    setMakeId("");
    setModelId("");
    setVariantId("");
    setYear("");

    setModels([]);
    setGenerations([]);
    setVariants([]);
  };

  // --------------------------------------------------
  // VEHICLE SUMMARY
  // --------------------------------------------------

  const getVehicleSummaryText = () => {
    const makeName =
      makes.find((m) => String(m.id) === makeId)?.name ||
      (makeId ? "VOLKSWAGEN" : "");

    const modelName =
      models.find((m) => String(m.id) === modelId)?.name || "";

    const variantName =
      variants.find((v) => String(v.id) === variantId)?.variant_name || "";

    return [makeName, modelName, variantName, year]
      .filter(Boolean)
      .join(" ");
  };
  // --------------------------------------------------
  // BUILD VEHICLE FILTER FOR CATALOGUE
  // --------------------------------------------------

  const getVehicleFilter = (): VehicleSearchFilter | undefined => {
    // No vehicle selected: allow normal department browsing.
    const hasAnyVehicleSelection = Boolean(
      makeId || modelId || variantId || year
    );

    if (!hasAnyVehicleSelection) {
      return undefined;
    }

    // A vehicle search must have both a variant and a year.
    if (!variantId || !year) {
      alert("Please select a vehicle variant and year before searching.");
      return undefined;
    }

    return {
      variantId: Number(variantId),
      year: Number(year),
    };
  };

  // --------------------------------------------------
  // OPEN CATALOGUE
  // --------------------------------------------------

  const handleOpenCatalogue = (
    categoryId: string,
    categoryName: string
  ) => {
    const hasAnyVehicleSelection = Boolean(
      makeId || modelId || variantId || year
    );

    const vehicleFilter = getVehicleFilter();

    // If the user started selecting a vehicle but did not finish,
    // do not open a catalogue that could return misleading results.
    if (hasAnyVehicleSelection && !vehicleFilter) {
      return;
    }

    onOpenCatalogue(categoryId, categoryName, vehicleFilter);
  };

  // --------------------------------------------------
  // FIND PARTS
  // --------------------------------------------------

  const handleFindParts = () => {
    const dept = DEPARTMENTS.find(
      (item) => item.id === selectedDepartment
    );

    const categoryName =
      DATABASE_CATEGORY_NAMES[selectedDepartment] ||
      dept?.label ||
      "All Departments";

    handleOpenCatalogue(selectedDepartment, categoryName);
  };

  // --------------------------------------------------
  // ADD VEHICLE TO GARAGE
  // --------------------------------------------------

  const handleAddToGarage = () => {
    const summary = getVehicleSummaryText();

    if (!summary) {
      alert("Select vehicle details first to add to My Garage.");
      return;
    }

    setGarageVehicles((prev) =>
      prev.includes(summary) ? prev : [summary, ...prev]
    );
  };

  const activeDepartmentLabel =
    DEPARTMENTS.find((d) => d.id === selectedDepartment)?.label ||
    "All Departments";

  // --------------------------------------------------
  // PAGE LAYOUT
  // --------------------------------------------------

  return (
    <div className="part-search-page">
      <div className="part-search-container">
        {/* VEHICLE SELECTION PANEL */}
        <aside className="ps-vehicle-panel">
          <div className="ps-vehicle-header">
            <div className="ps-vehicle-title-group">
              <Car size={18} color="#16288a" />
              <h2>Your Vehicle</h2>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              className="ps-clear-btn"
            >
              Clear
            </button>
          </div>

          {apiError && (
            <div className="ps-api-error">{apiError}</div>
          )}

          {/* MAKE */}
          <div className="ps-field-group">
            <label
              htmlFor="ps-make-select"
              className="ps-field-label"
            >
              MAKE
            </label>

            <div className="ps-make-pill">
              <select
                id="ps-make-select"
                value={makeId}
                disabled={loadingMakes}
                onChange={(e) => {
                  setMakeId(e.target.value);
                  setModelId("");
                  setVariantId("");
                  setYear("");
                }}
                className="ps-make-select"
              >
                <option value="">
                  {loadingMakes ? "Loading Makes..." : "Select Make..."}
                </option>

                {makes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name.toUpperCase()}
                  </option>
                ))}
              </select>

              {makeId && (
                <button
                  type="button"
                  onClick={handleClearMake}
                  className="ps-make-clear"
                  aria-label="Clear Make"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* MODEL */}
          <div className="ps-field-group">
            <label
              htmlFor="ps-model-select"
              className="ps-field-label"
            >
              MODEL
            </label>

            <select
              id="ps-model-select"
              value={modelId}
              disabled={!makeId || loadingModels}
              onChange={(e) => {
                setModelId(e.target.value);
                setVariantId("");
                setYear("");
              }}
              className="ps-select"
            >
              <option value="">
                {loadingModels ? "Loading Models..." : "Select Model..."}
              </option>

              {models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* VARIANT */}
          <div className="ps-field-group">
            <label
              htmlFor="ps-variant-select"
              className="ps-field-label"
            >
              VARIANT
            </label>

            <select
              id="ps-variant-select"
              value={variantId}
              disabled={!modelId || loadingVariants}
              onChange={(e) => {
                setVariantId(e.target.value);
                setYear("");
              }}
              className="ps-select"
            >
              <option value="">
                {loadingVariants
                  ? "Loading Variants..."
                  : "Select Variant..."}
              </option>

              {variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.variant_name}
                </option>
              ))}
            </select>
          </div>

          {/* YEAR */}
          <div className="ps-field-group">
            <label
              htmlFor="ps-year-select"
              className="ps-field-label"
            >
              YEAR
            </label>

            <select
              id="ps-year-select"
              value={year}
              disabled={!modelId || loadingGenerations}
              onChange={(e) => setYear(e.target.value)}
              className="ps-select"
            >
              <option value="">
                {loadingGenerations ? "Loading Years..." : "Select Year..."}
              </option>

              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {/* SELECTION PROGRESS */}
          <div className="ps-progress-row">
            <span className="ps-progress-text">
              {selectedCount}/4 selected
            </span>

            <div className="ps-progress-track">
              <div
                className="ps-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* FIND PARTS BUTTON */}
          <button
            type="button"
            onClick={handleFindParts}
            className="ps-find-btn"
          >
            <span>Find Parts</span>
            <ArrowRight size={16} />
          </button>

          {/* ADD TO GARAGE */}
          <button
            type="button"
            onClick={handleAddToGarage}
            className={`ps-garage-btn ${
              selectedCount > 0 ? "is-ready" : ""
            }`}
          >
            <Bookmark size={15} />
            <span>Add to My Garage</span>
          </button>

          {garageVehicles.length > 0 && (
            <div className="ps-garage-note">
              Saved ({garageVehicles.length}): {garageVehicles[0]}
            </div>
          )}
        </aside>

        {/* DEPARTMENTS PANEL */}
        <section className="ps-departments-panel">
          <div className="ps-departments-header">
            <div className="ps-departments-title-group">
              <LayoutGrid size={18} color="#16288a" />
              <h2>Browse by Department</h2>
            </div>

            <span className="ps-active-badge">
              {activeDepartmentLabel}
            </span>
          </div>

          {/* DEPARTMENT CARDS */}
          <div className="ps-departments-grid">
            {DEPARTMENTS.map((dept) => {
              const isSelected = selectedDepartment === dept.id;

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    setSelectedDepartment(dept.id);

                    handleOpenCatalogue(
                      dept.id,
                      DATABASE_CATEGORY_NAMES[dept.id] || dept.label
                    );
                  }}
                  className={`ps-department-card ${
                    isSelected ? "is-selected" : ""
                  }`}
                >
                  <span className="ps-card-arrow">
                    <ArrowRight size={15} />
                  </span>

                  <span className="ps-card-icon">
                    <DepartmentIcon type={dept.icon} />
                  </span>

                  <span className="ps-card-name">
                    {dept.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* TOURS BUTTON */}
      <button
        type="button"
        onClick={() =>
          alert(
            "1. Select your Make, Model, Variant & Year on the left.\n2. Choose a department on the right.\n3. Click Find Parts to view matching spares."
          )
        }
        className="ps-tours-btn"
      >
        <HelpCircle size={15} />
        <span>Tours</span>
      </button>
    </div>
  );
}

export default PartSearch;
