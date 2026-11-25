
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Car,
  Hash,
  Package,
} from "lucide-react";

import "../css/App.css";
import PartSearch from "./PartSearch";
import { PartCatalogue } from "./PartCatalogue";
import AddPart from "./AddPart";
import type { VehicleSearchFilter } from "./PartSearch";

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

interface VehicleEngine {
  id: number;
  engine_code: string;
  displacement_cc: number | null;
  fuel_type: string | null;
  power_kw: number | null;
  aspiration: string | null;
}

type ActiveTab =
  | "home"
  | "vehicle"
  | "parts"
  | "catalogue"
  | "addPart";

// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");

  // Search states
  const [quickQuery, setQuickQuery] = useState("");
  const [vin, setVin] = useState("VF15RSVDA61440587");
  const [engineNumber, setEngineNumber] = useState("");

  // Cascading vehicle dropdown states
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [generation, setGeneration] = useState("");
  const [variant, setVariant] = useState("");
  const [engine, setEngine] = useState("");

  // Database records
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [generations, setGenerations] = useState<VehicleGeneration[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [engines, setEngines] = useState<VehicleEngine[]>([]);

  // Catalogue selection states
  const [catalogueCategoryName, setCatalogueCategoryName] = useState("");

  const [catalogueVehicleFilter, setCatalogueVehicleFilter] =
    useState<VehicleSearchFilter | undefined>(undefined);

  // Open the selected department's product catalogue.
  const openCatalogue = (
    _categoryId: string,
    categoryName: string,
    vehicleFilter?: VehicleSearchFilter
  ) => {
    setCatalogueCategoryName(categoryName);
    setCatalogueVehicleFilter(vehicleFilter);
    setActiveTab("catalogue");
  };

  // Loading and error states
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [apiError, setApiError] = useState("");

  // --------------------------------------------------
  // LOAD VEHICLE MAKES
  // --------------------------------------------------

  useEffect(() => {
    async function loadMakes() {
      try {
        setLoadingMakes(true);
        setApiError("");

        const response = await fetch(
          "http://localhost:5000/api/vehicles/makes"
        );

        if (!response.ok) {
          throw new Error("Could not load vehicle makes.");
        }

        const data: VehicleMake[] = await response.json();
        setMakes(data);
      } catch (error) {
        console.error("Error loading vehicle makes:", error);
        setApiError("Unable to connect to the vehicle database.");
      } finally {
        setLoadingMakes(false);
      }
    }

    loadMakes();
  }, []);

  // --------------------------------------------------
  // LOAD MODELS
  // --------------------------------------------------

  useEffect(() => {
    if (!make) {
      setModels([]);
      return;
    }

    async function loadModels() {
      try {
        setLoadingModels(true);
        setApiError("");

        const response = await fetch(
          `http://localhost:5000/api/vehicles/models?makeId=${make}`
        );

        if (!response.ok) {
          throw new Error("Could not load vehicle models.");
        }

        const data: VehicleModel[] = await response.json();
        setModels(data);
      } catch (error) {
        console.error("Error loading vehicle models:", error);
        setApiError("Unable to load vehicle models.");
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [make]);

  // --------------------------------------------------
  // LOAD GENERATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!model) {
      setGenerations([]);
      return;
    }

    async function loadGenerations() {
      try {
        setLoadingGenerations(true);
        setApiError("");

        const response = await fetch(
          `http://localhost:5000/api/vehicles/generations?modelId=${model}`
        );

        if (!response.ok) {
          throw new Error("Could not load vehicle generations.");
        }

        const data: VehicleGeneration[] = await response.json();
        setGenerations(data);
      } catch (error) {
        console.error("Error loading generations:", error);
        setApiError("Unable to load vehicle generations.");
      } finally {
        setLoadingGenerations(false);
      }
    }

    loadGenerations();
  }, [model]);

  // --------------------------------------------------
  // LOAD VARIANTS
  // --------------------------------------------------

  useEffect(() => {
    if (!generation) {
      setVariants([]);
      setLoadingVariants(false);
      return;
    }

    const controller = new AbortController();

    async function loadVariants() {
      try {
        setLoadingVariants(true);
        setApiError("");
        setVariants([]);

        const response = await fetch(
          `http://localhost:5000/api/vehicles/variants?generationId=${generation}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load variants. Status: ${response.status}`
          );
        }

        const data: VehicleVariant[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The variants response is not an array.");
        }

        setVariants(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Error loading variants:", error);
        setApiError("Unable to load vehicle variants.");
        setVariants([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingVariants(false);
        }
      }
    }

    loadVariants();

    return () => controller.abort();
  }, [generation]);

  // --------------------------------------------------
  // LOAD ENGINES
  // --------------------------------------------------

  useEffect(() => {
    if (!variant) {
      setEngines([]);
      return;
    }

    async function loadEngines() {
      try {
        setLoadingEngines(true);
        setApiError("");

        const response = await fetch(
          `http://localhost:5000/api/vehicles/engines?variantId=${variant}`
        );

        if (!response.ok) {
          throw new Error("Could not load vehicle engines.");
        }

        const data: VehicleEngine[] = await response.json();
        setEngines(data);
      } catch (error) {
        console.error("Error loading vehicle engines:", error);
        setApiError("Unable to load vehicle engines.");
      } finally {
        setLoadingEngines(false);
      }
    }

    loadEngines();
  }, [variant]);

  // --------------------------------------------------
  // VEHICLE SELECTION HANDLERS
  // --------------------------------------------------

  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel("");
    setGeneration("");
    setVariant("");
    setEngine("");

    setModels([]);
    setGenerations([]);
    setVariants([]);
    setEngines([]);
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    setGeneration("");
    setVariant("");
    setEngine("");

    setGenerations([]);
    setVariants([]);
    setEngines([]);
  };

  const handleGenerationChange = (value: string) => {
    setGeneration(value);
    setVariant("");
    setEngine("");

    setVariants([]);
    setEngines([]);
  };

  const handleVariantChange = (value: string) => {
    setVariant(value);
    setEngine("");
    setEngines([]);
  };

  // --------------------------------------------------
  // QUICK SEARCH
  // --------------------------------------------------

  const handleQuickSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!quickQuery.trim()) {
      alert("Enter a vehicle make, model, part type, or part number.");
      return;
    }

    setActiveTab("parts");
  };

  // --------------------------------------------------
  // REGISTRATION / VIN SEARCH
  // --------------------------------------------------

  const handleRegistrationSearch = () => {
    if (!vin.trim() && !engineNumber.trim()) {
      alert("Please enter a VIN number or engine number.");
      return;
    }

    alert(
      vin.trim()
        ? `Searching vehicle by VIN: ${vin.trim()}`
        : `Searching vehicle by Engine Number: ${engineNumber.trim()}`
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="catalogue-page">
      {/* TOP HEADER */}
      <header className="catalogue-header">
        <div className="catalogue-header-top">
          <div>
            <div className="brand-mark">
              <span className="brand-triangle">▲</span>
              <span className="brand-title">IGNITE</span>
            </div>

            <p className="brand-subtitle">AUTOMOTIVE CATALOGUE</p>
          </div>

          <div className="header-account-area">
            <div className="welcome-banner">
              <span>WELCOME BACK MISS ESTHER AKINDELE</span>
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="catalogue-nav">
          <div className="catalogue-nav-inner">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`nav-tab-btn ${
                activeTab === "home" ? "is-active" : ""
              }`}
            >
              HOME
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("vehicle")}
              className={`nav-tab-btn ${
                activeTab === "vehicle" ? "is-active" : ""
              }`}
            >
              VEHICLE SEARCH
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("parts")}
              className={`nav-tab-btn ${
                activeTab === "parts" ? "is-active" : ""
              }`}
            >
              PART SEARCH
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("addPart")}
              className={`nav-tab-btn ${
                activeTab === "addPart" ? "is-active" : ""
              }`}
            >
              ADD PART
            </button>
          </div>
        </nav>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="catalogue-main">
        <div className="catalogue-grid">
          <section className="center-column">
            {/* API ERROR */}
            {apiError && (
              <div className="api-error-banner">{apiError}</div>
            )}

            {/* QUICK SEARCH */}
            {activeTab === "home" && (
              <div className="panel-card">
                <div className="panel-heading-center">
                  <Search size={14} strokeWidth={2.5} />
                  <h2>QUICK SEARCH</h2>
                </div>

                <div className="search-box-inner">
                  <form
                    onSubmit={handleQuickSearch}
                    className="quick-search-form"
                  >
                    <input
                      type="text"
                      value={quickQuery}
                      onChange={(e) => setQuickQuery(e.target.value)}
                      placeholder="ENTER VEHICLE MAKE, MODEL, PART TYPE OR PART NUMBER"
                      className="quick-search-input"
                    />

                    <button
                      type="submit"
                      className="arrow-submit-btn"
                      aria-label="Run Quick Search"
                    >
                      <span>»</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* BROWSE PARTS CATALOGUE */}
            {activeTab === "home" && (
              <div className="panel-card">
                <div className="panel-heading-center">
                  <Package size={18} />
                  <h2>VW PARTS CATALOGUE</h2>
                </div>

                <div className="search-box-inner">
                  <p>
                    Find Volkswagen spare parts by selecting a vehicle and
                    browsing the available parts departments.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveTab("parts")}
                    className="arrow-submit-btn"
                  >
                    BROWSE PARTS CATALOGUE <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* VEHICLE SEARCH */}
            {(activeTab === "home" || activeTab === "vehicle") && (
              <div className="panel-card">
                <div className="panel-heading-center">
                  <Car size={15} strokeWidth={2.2} />
                  <h2>VEHICLE SEARCH</h2>
                </div>

                <div className="search-box-inner vehicle-fields-stack">
                  {/* MAKE */}
                  <select
                    value={make}
                    onChange={(e) => handleMakeChange(e.target.value)}
                    disabled={loadingMakes}
                    aria-label="Select Vehicle Make"
                    className="catalogue-select"
                  >
                    <option value="">
                      {loadingMakes
                        ? "LOADING VEHICLE MAKES..."
                        : "SELECT VEHICLE MAKE"}
                    </option>

                    {makes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {/* MODEL */}
                  <select
                    value={model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={!make || loadingModels}
                    aria-label="Select Vehicle Model"
                    className="catalogue-select"
                  >
                    <option value="">
                      {loadingModels
                        ? "LOADING MODELS..."
                        : make
                        ? "SELECT VEHICLE MODEL"
                        : "SELECT MAKE FIRST"}
                    </option>

                    {models.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  {/* GENERATION */}
                  <select
                    value={generation}
                    onChange={(e) =>
                      handleGenerationChange(e.target.value)
                    }
                    disabled={!model || loadingGenerations}
                    aria-label="Select Generation"
                    className="catalogue-select"
                  >
                    <option value="">
                      {loadingGenerations
                        ? "LOADING GENERATIONS..."
                        : model
                        ? "SELECT GENERATION / BODY"
                        : "SELECT MODEL FIRST"}
                    </option>

                    {generations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.generation_name}
                        {item.platform_code
                          ? ` (${item.platform_code})`
                          : ""}{" "}
                        — {item.year_start || "?"}–
                        {item.year_end || "Present"}
                      </option>
                    ))}
                  </select>

                  {/* VARIANT */}
                  <select
                    value={variant}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    disabled={!generation || loadingVariants}
                    aria-label="Select Variant"
                    className="catalogue-select"
                  >
                    <option value="">
                      {loadingVariants
                        ? "LOADING VARIANTS..."
                        : !generation
                        ? "SELECT GENERATION FIRST"
                        : variants.length === 0
                        ? "NO VARIANTS FOUND"
                        : "SELECT VEHICLE VARIANT"}
                    </option>

                    {variants.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.variant_name}
                      </option>
                    ))}
                  </select>

                  {/* ENGINE */}
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    disabled={!variant || loadingEngines}
                    aria-label="Select Engine"
                    className="catalogue-select"
                  >
                    <option value="">
                      {loadingEngines
                        ? "LOADING ENGINES..."
                        : variant
                        ? "SELECT ENGINE"
                        : "SELECT VARIANT FIRST"}
                    </option>

                    {engines.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.engine_code} — {item.displacement_cc || ""} cc
                        {" • "}
                        {item.fuel_type || ""} {" • "}
                        {item.power_kw || ""} kW
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* REGISTRATION / VIN SEARCH */}
            {(activeTab === "home" || activeTab === "vehicle") && (
              <div className="panel-card">
                <div className="panel-heading-center">
                  <Hash size={14} strokeWidth={2.5} />
                  <h2>REGISTRATION SEARCH</h2>
                </div>

                <div className="search-box-inner reg-search-stack">
                  {/* VIN */}
                  <div className="reg-field-row">
                    <label
                      htmlFor="vin-input"
                      className="reg-field-label"
                    >
                      VIN NUMBER
                    </label>

                    <input
                      id="vin-input"
                      type="text"
                      value={vin}
                      onChange={(e) =>
                        setVin(e.target.value.toUpperCase())
                      }
                      maxLength={17}
                      placeholder="ENTER 17-CHARACTER VIN"
                      className="reg-field-input"
                    />
                  </div>

                  {/* ENGINE NUMBER */}
                  <div className="reg-field-row">
                    <label
                      htmlFor="engine-number-input"
                      className="reg-field-label"
                    >
                      ENGINE NUMBER
                    </label>

                    <div className="reg-engine-group">
                      <input
                        id="engine-number-input"
                        type="text"
                        value={engineNumber}
                        onChange={(e) =>
                          setEngineNumber(e.target.value.toUpperCase())
                        }
                        placeholder="ENTER ENGINE NUMBER"
                        className="reg-field-input"
                      />

                      <button
                        type="button"
                        onClick={handleRegistrationSearch}
                        className="reg-spin-btn"
                        title="Identify Vehicle"
                      >
                        <ChevronUp size={11} />
                        <ChevronDown size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PART SEARCH PAGE */}
            {activeTab === "parts" && (
              <PartSearch
                onOpenCatalogue={(
                  categoryId,
                  categoryName,
                  vehicleFilter
                ) => {
                  openCatalogue(
                    categoryId,
                    categoryName,
                    vehicleFilter
                  );
                }}
              />
            )}

            {/* PARTS CATALOGUE PAGE */}
            {activeTab === "catalogue" && (
              <PartCatalogue
                categoryName={catalogueCategoryName}
                vehicleFilter={catalogueVehicleFilter}
                onBack={() => setActiveTab("parts")}
              />
            )}

            {/* ADD NEW PART PAGE */}
            {activeTab === "addPart" && (
              <AddPart
                onBack={() => setActiveTab("home")}
                onSaved={() => {
                  console.log("New product saved successfully.");
                }}
              />
            )}
          </section>
        </div>
      </main>

      {/* BOTTOM FOOTER */}
      <footer className="catalogue-footer">
        <div className="catalogue-footer-inner">
          <div className="footer-links-group">
            <a href="#terms">TERMS OF USE</a>
            <a href="#privacy">PRIVACY</a>
            <a href="#contact">CONTACT US</a>
            <a href="#about">ABOUT</a>
            <a href="#academy">IGNITE ACADEMY</a>
            <a href="#brands">IGNITE BRANDS</a>
          </div>

          <div className="footer-location-note">
            AutomotivePOS • Mbombela
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
