import { Pool } from "pg";

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: {
        rejectUnauthorized: false,
    },
});

export default pool;

//Host=cheeky-sponge-25403.j77.aws-ap-south-1.cockroachlabs.cloud;Port=26257;Database=codeinsights;Username=forwebdevelopment;Password=xQNyPh1ZdZFvMBt8tfPQHw;SslMode=Require;Trust Server Certificate=true
