
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// --------------------------------------------------
// GET ALL PART CATEGORIES
// GET /api/parts/categories
// --------------------------------------------------
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        description
      FROM part_categories
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching part categories:", error.message);

    res.status(500).json({
      message: "Could not load part categories.",
    });
  }
});

// --------------------------------------------------
// GET PARTS
//
// Optional query parameters:
// /api/parts?categoryId=1
// /api/parts?search=brake
// /api/parts?variantId=5
// /api/parts?variantId=5&year=2012
// /api/parts?categoryId=1&variantId=5&year=2012
// --------------------------------------------------
router.get("/", async (req, res) => {
  const { categoryId, search, variantId, year } = req.query;

  try {
    const values = [];
    const conditions = [];

    // --------------------------------------------------
    // CATEGORY FILTER
    // --------------------------------------------------
    if (categoryId !== undefined && categoryId !== "") {
      const numericCategoryId = Number(categoryId);

      if (
        !Number.isInteger(numericCategoryId) ||
        numericCategoryId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId.",
        });
      }

      values.push(numericCategoryId);

      conditions.push(
        `p.category_id = $${values.length}`
      );
    }

    // --------------------------------------------------
    // TEXT SEARCH
    // --------------------------------------------------
    if (search && String(search).trim()) {
      values.push(`%${String(search).trim()}%`);

      const searchParameter = `$${values.length}`;

      conditions.push(`
        (
          p.name ILIKE ${searchParameter}
          OR p.part_number ILIKE ${searchParameter}
          OR COALESCE(p.oem_part_number, '') ILIKE ${searchParameter}
          OR COALESCE(p.barcode, '') ILIKE ${searchParameter}
          OR COALESCE(pb.name, '') ILIKE ${searchParameter}
        )
      `);
    }

    // --------------------------------------------------
    // VEHICLE VARIANT AND YEAR FILTER
    // --------------------------------------------------
    if (variantId !== undefined && variantId !== "") {
      const numericVariantId = Number(variantId);

      if (
        !Number.isInteger(numericVariantId) ||
        numericVariantId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid variantId.",
        });
      }

      values.push(numericVariantId);

      const variantParameter = `$${values.length}`;

      let yearCondition = "";

      // If a year is supplied, match the exact year
      // saved in part_compatibility.model_year.
      if (year !== undefined && year !== "") {
        const numericYear = Number(year);

        if (
          !Number.isInteger(numericYear) ||
          numericYear < 1900 ||
          numericYear > 2100
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid year.",
          });
        }

        values.push(numericYear);

        const yearParameter = `$${values.length}`;

        yearCondition = `
          AND pc.model_year = ${yearParameter}
        `;
      }

      conditions.push(`
        EXISTS (
          SELECT 1
          FROM part_compatibility pc
          WHERE pc.part_id = p.id
            AND pc.variant_id = ${variantParameter}
            ${yearCondition}
        )
      `);
    } else if (year !== undefined && year !== "") {
      return res.status(400).json({
        success: false,
        message: "Select a vehicle variant before filtering by year.",
      });
    }

    // --------------------------------------------------
    // BUILD WHERE CLAUSE
    // --------------------------------------------------
    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    // --------------------------------------------------
    // FETCH PARTS
    // --------------------------------------------------
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.part_number,
        p.oem_part_number,
        p.name,
        p.description,
        p.cost_price,
        p.selling_price,
        p.vat_rate,
        p.unit_of_measure,
        p.barcode,
        p.is_active,

        pcg.id AS category_id,
        pcg.name AS category_name,

        pb.id AS brand_id,
        pb.name AS brand_name,

        COALESCE(s.quantity_on_hand, 0) AS quantity_on_hand,
        COALESCE(s.minimum_stock_level, 0) AS minimum_stock_level,
        s.location,

        pi.image_url,
        pi.file_name,
        pi.alt_text

      FROM parts p

      LEFT JOIN part_categories pcg
        ON pcg.id = p.category_id

      LEFT JOIN part_brands pb
        ON pb.id = p.brand_id

      LEFT JOIN stock s
        ON s.part_id = p.id

      LEFT JOIN LATERAL (
        SELECT
          image_url,
          file_name,
          alt_text
        FROM part_images
        WHERE part_id = p.id
        ORDER BY is_primary DESC, sort_order ASC, id ASC
        LIMIT 1
      ) pi ON true

      ${whereClause}

      ORDER BY p.name ASC
      `,
      values
    );

    res.json({
      success: true,
      count: result.rows.length,
      parts: result.rows,
    });

  } catch (error) {
    console.error("Error fetching parts:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load parts.",
    });
  }
});

export default router;
