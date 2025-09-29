require('dotenv').config();
const express = require('express');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;

// ======================
// Conexión a Neo4j
// ======================
const driver = neo4j.driver(
  process.env.NEO4J_URI, // 👉 viene del .env (ej: bolt://neo4j:7687)
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// ======================
// Middlewares
// ======================
app.use(express.json());

// ======================
// Rutas
// ======================

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: '✅ API funcionando con Neo4j' });
});

// Personas paginadas
// Ejemplo: GET /people?page=2
app.get('/people', async (req, res) => {
  const session = driver.session();
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const query = `
      MATCH (p:Person)-[:LIVES_IN]->(c:City)
      RETURN p {.*, city: c.name } AS person
      SKIP $skip LIMIT $limit
    `;

    const result = await session.run(query, {
      skip: neo4j.int(skip),
      limit: neo4j.int(limit)
    });

    const people = result.records.map(r => r.get('person'));

    res.json({
      page,
      perPage: limit,
      results: people
    });

  } catch (error) {
    console.error('❌ Error al obtener personas:', error);
    res.status(500).json({ error: 'Error interno en el servidor', details: error.message });
  } finally {
    await session.close();
  }
});

// Ciudades paginadas
// Ejemplo: GET /cities?page=1
app.get('/cities', async (req, res) => {
  const session = driver.session();
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const query = `
      MATCH (c:City)
      RETURN c {.*} AS city
      SKIP $skip LIMIT $limit
    `;

    const result = await session.run(query, {
      skip: neo4j.int(skip),
      limit: neo4j.int(limit)
    });
    const cities = result.records.map(r => r.get('city'));

    res.json({
      page,
      perPage: limit,
      results: cities
    });

  } catch (error) {
    console.error('❌ Error al obtener ciudades:', error);
    res.status(500).json({ error: 'Error interno en el servidor', details: error.message });
  } finally {
    await session.close();
  }
});

// Crear una persona con datos aleatorios
app.post('/people', async (req, res) => {
  const session = driver.session();
  try {
    // Generar datos aleatorios
    const randomId = Math.floor(Math.random() * 10000);
    const names = ["Camilo", "Laura", "Andrés", "María", "Sofía", "Carlos", "Valentina", "Daniel"];
    const cities = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];
    
    const personName = names[Math.floor(Math.random() * names.length)];
    const personAge = Math.floor(Math.random() * 80) + 18; // entre 18 y 98 años
    const cityName = cities[Math.floor(Math.random() * cities.length)];

    // Query de creación
    const query = `
      MERGE (c:City {name: $cityName})
      CREATE (p:Person {personId: $id, name: $name, age: $age})
      MERGE (p)-[:LIVES_IN]->(c)
      RETURN p {.*, city: c.name } AS person
    `;

    const result = await session.run(query, {
      id: neo4j.int(randomId),
      name: personName,
      age: neo4j.int(personAge),
      cityName
    });

    const newPerson = result.records[0].get('person');

    res.status(201).json({
      message: '✅ Persona creada con éxito',
      person: newPerson
    });

  } catch (error) {
    console.error('❌ Error al crear persona:', error);
    res.status(500).json({ error: 'Error interno en el servidor', details: error.message });
  } finally {
    await session.close();
  }
});

// Ruta para forzar un 400
app.get('/force-400', (req, res) => {
  res.status(400).json({ error: "Solicitud inválida (forzado)" });
});

// Ruta para forzar un 404
app.get('/force-404', (req, res) => {
  res.status(404).json({ error: "Solicitud inválida (forzado)" });
});

// Ruta para forzar un 502
app.get("/force-502", (req, res) => {
  res.status(502).send("Simulación de 502 desde el backend");
});

// ======================
// Iniciar servidor
// ======================
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
