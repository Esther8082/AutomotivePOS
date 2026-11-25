
import express from "express";
import pool from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const router = express.Router();

// --------------------------------------------------
// 1. IMAGE UPLOAD CONFIGURATION
// --------------------------------------------------

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const uploadDirectory = path.join(
  currentDirectory,
  "../uploads/parts"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, WEBP and GIF images are allowed.")
      );
    }

    callback(null, true);
  },
});

// Handle image upload errors.
const uploadSingleImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "The image must not exceed 5MB."
            : error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next();
  });
};

// Remove an uploaded file if registration fails.
function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error("Could not remove uploaded image:", error.message);
    }
  }
}

// Validate a positive integer ID.
function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

// --------------------------------------------------
// 2. GET ALL PRODUCT BRANDS
// GET /api/parts/brands
// --------------------------------------------------

router.get("/brands", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        description
      FROM part_brands
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching product brands:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load product brands.",
    });
  }
});

// --------------------------------------------------
// 3. REGISTER A NEW PART
// POST /api/parts
// --------------------------------------------------

router.post("/", uploadSingleImage, async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const {
      part_number,
      oem_part_number,
      name,
      description,
      category_id,
      brand_id,
      cost_price,
      selling_price,
      vat_rate,
      unit_of_measure,
      barcode,
      quantity_on_hand,
      minimum_stock_level,
      location,
      compatible_vehicles,
    } = req.body;

    // --------------------------------------------------
    // A. VALIDATE REQUIRED PRODUCT FIELDS
    // --------------------------------------------------

    if (
      !part_number?.trim() ||
      !name?.trim() ||
      !category_id ||
      selling_price === undefined ||
      selling_price === ""
    ) {
      const error = new Error(
        "Part number, product name, department and selling price are required."
      );
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------------------
    // B. CONVERT AND VALIDATE NUMERIC FIELDS
    // --------------------------------------------------

    const categoryId = Number(category_id);
    const brandId = brand_id ? Number(brand_id) : null;

    const costPrice =
      cost_price === "" || cost_price === undefined
        ? null
        : Number(cost_price);

    const sellingPrice = Number(selling_price);

    const vatRate =
      vat_rate === "" || vat_rate === undefined
        ? 15
        : Number(vat_rate);

    const openingQuantity =
      quantity_on_hand === "" || quantity_on_hand === undefined
        ? 0
        : Number(quantity_on_hand);

    const minimumStock =
      minimum_stock_level === "" || minimum_stock_level === undefined
        ? 0
        : Number(minimum_stock_level);

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0 ||
      (brandId !== null &&
        (!Number.isInteger(brandId) || brandId <= 0)) ||
      (costPrice !== null &&
        (!Number.isFinite(costPrice) || costPrice < 0)) ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isFinite(vatRate) ||
      vatRate < 0 ||
      vatRate > 100 ||
      !Number.isInteger(openingQuantity) ||
      openingQuantity < 0 ||
      !Number.isInteger(minimumStock) ||
      minimumStock < 0
    ) {
      const error = new Error(
        "One or more numeric fields contain invalid values."
      );
      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------------------
    // C. PARSE VEHICLE COMPATIBILITY
    // --------------------------------------------------

    let compatibilityList = [];

    if (compatible_vehicles) {
      try {
        compatibilityList = JSON.parse(compatible_vehicles);
      } catch {
        const error = new Error(
          "Vehicle compatibility information is not valid JSON."
        );
        error.statusCode = 400;
        throw error;
      }
    }

    if (!Array.isArray(compatibilityList)) {
      const error = new Error(
        "Vehicle compatibility must be a list."
      );
      error.statusCode = 400;
      throw error;
    }

    // Validate each selected vehicle.
    const seenCompatibility = new Set();

    compatibilityList = compatibilityList.map((item) => {
  const variantId = Number(item.variant_id);

  const engineId =
    item.engine_id === null ||
    item.engine_id === undefined ||
    item.engine_id === ""
      ? null
      : Number(item.engine_id);

  const modelYear = Number(item.model_year);

  if (!isValidId(variantId)) {
    const error = new Error(
      "A selected vehicle has an invalid variant."
    );
    error.statusCode = 400;
    throw error;
  }

  if (engineId !== null && !isValidId(engineId)) {
    const error = new Error(
      "A selected vehicle has an invalid engine."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isInteger(modelYear) ||
    modelYear < 1900 ||
    modelYear > 2100
  ) {
    const error = new Error(
      "A valid model year must be selected for every compatible vehicle."
    );
    error.statusCode = 400;
    throw error;
  }

  // The same variant can be selected for different years.
  // Only prevent duplicate variant/engine/year combinations.
  const combinationKey =
    `${variantId}-${engineId ?? "ALL"}-${modelYear}`;

  if (seenCompatibility.has(combinationKey)) {
    const error = new Error(
      "The same vehicle variant, engine and year have been selected more than once."
    );
    error.statusCode = 400;
    throw error;
  }

  seenCompatibility.add(combinationKey);

  return {
    variant_id: variantId,
    engine_id: engineId,
    model_year: modelYear,
    notes: item.notes?.trim() || null,
  };
});

    // --------------------------------------------------
    // D. CHECK FOR DUPLICATE PART NUMBER
    // --------------------------------------------------

    const duplicate = await pool.query(
      `
      SELECT id
      FROM parts
      WHERE LOWER(part_number) = LOWER($1)
      LIMIT 1
      `,
      [part_number.trim()]
    );

    if (duplicate.rows.length > 0) {
      const error = new Error(
        "This part number already exists."
      );
      error.statusCode = 409;
      throw error;
    }

    // --------------------------------------------------
    // E. START DATABASE TRANSACTION
    // --------------------------------------------------

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // --------------------------------------------------
    // F. VALIDATE VEHICLE VARIANTS AND ENGINES
    // --------------------------------------------------

    for (const vehicle of compatibilityList) {
      const variantResult = await client.query(
        `
        SELECT id
        FROM vehicle_variants
        WHERE id = $1
        `,
        [vehicle.variant_id]
      );

      if (variantResult.rows.length === 0) {
        const error = new Error(
          `Vehicle variant ${vehicle.variant_id} does not exist.`
        );
        error.statusCode = 400;
        throw error;
      }

      if (vehicle.engine_id !== null) {
        const engineResult = await client.query(
          `
          SELECT id
          FROM vehicle_engines
          WHERE id = $1
            AND variant_id = $2
          `,
          [vehicle.engine_id, vehicle.variant_id]
        );

        if (engineResult.rows.length === 0) {
          const error = new Error(
            "The selected engine does not belong to the selected vehicle variant."
          );
          error.statusCode = 400;
          throw error;
        }
      }
    }

    // --------------------------------------------------
    // G. SAVE PRODUCT DETAILS
    // --------------------------------------------------

    const partResult = await client.query(
      `
      INSERT INTO parts (
        part_number,
        oem_part_number,
        name,
        description,
        category_id,
        brand_id,
        cost_price,
        selling_price,
        vat_rate,
        unit_of_measure,
        barcode
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        part_number.trim(),
        oem_part_number?.trim() || null,
        name.trim(),
        description?.trim() || null,
        categoryId,
        brandId,
        costPrice,
        sellingPrice,
        vatRate,
        unit_of_measure?.trim() || "Each",
        barcode?.trim() || null,
      ]
    );

    const newPart = partResult.rows[0];
    const partId = newPart.id;

    // --------------------------------------------------
    // H. SAVE OPENING STOCK
    // --------------------------------------------------

    const stockResult = await client.query(
      `
      INSERT INTO stock (
        part_id,
        quantity_on_hand,
        minimum_stock_level,
        location
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        partId,
        openingQuantity,
        minimumStock,
        location?.trim() || null,
      ]
    );

    // --------------------------------------------------
    // I. RECORD OPENING STOCK MOVEMENT
    // --------------------------------------------------

    if (openingQuantity > 0) {
      await client.query(
        `
        INSERT INTO stock_movements (
          part_id,
          movement_type,
          quantity,
          reference_type,
          reference_id,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          partId,
          "INITIAL_STOCK",
          openingQuantity,
          "PART_REGISTRATION",
          partId,
          "Initial stock recorded during product registration.",
        ]
      );
    }

   // --------------------------------------------------
// J. SAVE VEHICLE COMPATIBILITY
// --------------------------------------------------

const savedCompatibility = [];

for (const vehicle of compatibilityList) {
  const compatibilityResult = await client.query(
    `
    INSERT INTO part_compatibility (
      part_id,
      variant_id,
      engine_id,
      model_year,
      notes
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      partId,
      vehicle.variant_id,
      vehicle.engine_id,
      vehicle.model_year,
      vehicle.notes,
    ]
  );

  savedCompatibility.push(compatibilityResult.rows[0]);
}

    // --------------------------------------------------
    // K. SAVE PRODUCT IMAGE
    // --------------------------------------------------

    let savedImage = null;

    if (req.file) {
      const imageUrl = `/uploads/parts/${req.file.filename}`;

      const imageResult = await client.query(
        `
        INSERT INTO part_images (
          part_id,
          image_url,
          file_name,
          mime_type,
          file_size,
          alt_text,
          is_primary,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          partId,
          imageUrl,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          name.trim(),
          true,
          0,
        ]
      );

      savedImage = imageResult.rows[0];
    }

    // --------------------------------------------------
    // L. COMMIT TRANSACTION
    // --------------------------------------------------

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Product registered successfully.",
      part: newPart,
      stock: stockResult.rows[0],
      image: savedImage,
      compatibility: savedCompatibility,
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Database rollback failed:",
          rollbackError.message
        );
      }
    }

    // Remove the uploaded image if registration failed.
    removeUploadedFile(req.file);

    console.error("Error registering product:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Could not register the product. Please try again.",
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;
