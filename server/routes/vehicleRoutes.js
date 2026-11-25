
import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// =============================================
// VALIDATE IDs
// =============================================

function isValidId(value) {
  return (
    value !== undefined &&
    value !== null &&
    Number.isInteger(Number(value)) &&
    Number(value) > 0
  );
}

// =============================================
// 1. GET ALL VEHICLE MAKES
// =============================================

router.get("/makes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        code
      FROM vehicle_makes
      ORDER BY name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching vehicle makes:",
      error.message
    );

    res.status(500).json({
      message: "Could not load vehicle makes."
    });
  }
});

// =============================================
// 2. GET MODELS BELONGING TO A MAKE
// =============================================

router.get("/models", async (req, res) => {
  const { makeId } = req.query;

  if (!isValidId(makeId)) {
    return res.status(400).json({
      message: "A valid makeId is required."
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        code,
        make_id
      FROM vehicle_models
      WHERE make_id = $1
      ORDER BY name ASC
      `,
      [Number(makeId)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching vehicle models:",
      error.message
    );

    res.status(500).json({
      message: "Could not load vehicle models."
    });
  }
});

// =============================================
// 3. GET GENERATIONS BELONGING TO A MODEL
// =============================================

router.get("/generations", async (req, res) => {
  const { modelId } = req.query;

  if (!isValidId(modelId)) {
    return res.status(400).json({
      message: "A valid modelId is required."
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        model_id,
        name,
        code,
        start_year,
        end_year,
        name AS generation_name,
        code AS platform_code,
        start_year AS year_start,
        end_year AS year_end
      FROM vehicle_generations
      WHERE model_id = $1
      ORDER BY
        start_year ASC NULLS LAST,
        name ASC
      `,
      [Number(modelId)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching vehicle generations:",
      error.message
    );

    res.status(500).json({
      message: "Could not load vehicle generations."
    });
  }
});

// =============================================
// 4. GET VEHICLE VARIANTS
//
// Supports TWO options:
//
// A. ?modelId=1
//    Returns variants across ALL generations
//    belonging to the selected model.
//
// B. ?generationId=1
//    Returns variants belonging to one
//    specific generation.
//
// This keeps older application functionality.
// =============================================

router.get("/variants", async (req, res) => {
  const { modelId, generationId } = req.query;

  // ---------------------------------------------
  // OPTION A: GET ALL VARIANTS FOR A MODEL
  // ---------------------------------------------

  if (modelId !== undefined) {
    if (!isValidId(modelId)) {
      return res.status(400).json({
        message: "A valid modelId is required."
      });
    }

    try {
      const result = await pool.query(
        `
        SELECT
          vv.id,
          vv.generation_id,
          vv.variant_name,
          vv.body_style,
          vv.doors,
          vv.start_year,
          vv.end_year,

          vg.model_id,
          vg.name AS generation_name,
          vg.code AS generation_code,

          vv.start_year AS year_start,
          vv.end_year AS year_end

        FROM vehicle_variants vv

        INNER JOIN vehicle_generations vg
          ON vg.id = vv.generation_id

        WHERE vg.model_id = $1

        ORDER BY
          vv.start_year ASC NULLS LAST,
          vg.name ASC,
          vv.variant_name ASC,
          vv.body_style ASC NULLS LAST
        `,
        [Number(modelId)]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error(
        "Error fetching variants by model:",
        error.message
      );

      return res.status(500).json({
        message: "Could not load vehicle variants."
      });
    }
  }

  // ---------------------------------------------
  // OPTION B: GET VARIANTS FOR ONE GENERATION
  // ---------------------------------------------

  if (!isValidId(generationId)) {
    return res.status(400).json({
      message: "A valid modelId or generationId is required."
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        vv.id,
        vv.generation_id,
        vv.variant_name,
        vv.body_style,
        vv.doors,
        vv.start_year,
        vv.end_year,

        vg.model_id,
        vg.name AS generation_name,
        vg.code AS generation_code,

        vv.start_year AS year_start,
        vv.end_year AS year_end

      FROM vehicle_variants vv

      INNER JOIN vehicle_generations vg
        ON vg.id = vv.generation_id

      WHERE vv.generation_id = $1

      ORDER BY
        vv.variant_name ASC,
        vv.body_style ASC NULLS LAST
      `,
      [Number(generationId)]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching variants by generation:",
      error.message
    );

    return res.status(500).json({
      message: "Could not load vehicle variants."
    });
  }
});

// =============================================
// 5. GET ENGINES BELONGING TO A VARIANT
// =============================================

router.get("/engines", async (req, res) => {
  const { variantId } = req.query;

  if (!isValidId(variantId)) {
    return res.status(400).json({
      message: "A valid variantId is required."
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        variant_id,
        engine_code,
        engine_name,
        fuel_type,
        displacement_cc,
        power_kw,
        power_hp,
        transmission
      FROM vehicle_engines
      WHERE variant_id = $1
      ORDER BY engine_code ASC NULLS LAST
      `,
      [Number(variantId)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(
      "Error fetching vehicle engines:",
      error.message
    );

    res.status(500).json({
      message: "Could not load vehicle engines."
    });
  }
});

// =============================================
// EXPORT ROUTER
// =============================================

export default router;
