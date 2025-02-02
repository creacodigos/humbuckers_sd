# Usa la imagen oficial de Node.js
FROM node:20

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos
COPY . .

# Comando por defecto para ejecutar el script
CMD ["node", "scraper.js"]
