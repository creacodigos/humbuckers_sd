const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.seymourduncan.com/products/pickups/electric/humbucker';

async function getCSSLinks($) {
    const cssLinks = [];
    $('link[rel="stylesheet"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.startsWith('http')) {
            cssLinks.push(href);
        }
    });
    return cssLinks;
}

async function downloadCSS(cssLinks) {
    let cssContent = '';
    for (const link of cssLinks) {
        try {
            console.log(`🎨 Descargando CSS: ${link}`);
            const { data } = await axios.get(link);
            cssContent += `/* CSS from ${link} */\n${data}\n`;
        } catch (error) {
            console.error(`❌ Error descargando CSS ${link}:`, error.message);
        }
    }
    return cssContent;
}

async function getProductCharts(link, params = null) {
    let chartsHTML = '';
    try {
        console.log(`🛠️ Procesando producto: ${link}`);
        
        let response;
        if (params) {
            response = await axios.post(link, params);
        } else {
            response = await axios.get(link);
        }

        const product$ = cheerio.load(response.data);

        // Capturar todos los gráficos `.product-chart`
        const charts = product$('.product-chart');
        console.log(`📊 Gráficos encontrados: ${charts.length}`);
        
        if (charts.length > 0) {
            charts.each((index, element) => {
                chartsHTML += `
                    <div class="chart">
                        ${product$(element).html() || '<p>No se encontró contenido en este gráfico.</p>'}
                    </div>
                `;
            });
        } else {
            chartsHTML += `<p>❌ No se encontraron gráficos en esta página.</p>`;
        }

    } catch (error) {
        console.error(`❌ Error al obtener gráficos del producto ${link}:`, error.message);
    }
    return chartsHTML;
}

async function scrapeProductCharts() {
    try {
        let currentPage = BASE_URL;
        let visitedPages = new Set();
        let htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scraping Seymour Duncan</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .product { display:flow-root; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                .product h2 { font-size: 1em; }
                .chart { margin: 10px 0; border: padding: 1em; }
                .chart h3 { margin-bottom: 5px; font-size: 1em; color: #333; }
                ul, ol { padding:0px; }
            </style>
        `;

        const { data: mainPageData } = await axios.get(BASE_URL);
        const $main = cheerio.load(mainPageData);
        const cssLinks = await getCSSLinks($main);
        const cssContent = await downloadCSS(cssLinks);
        htmlContent += `<style>${cssContent}</style></head><body><h1>Resultados del Scraping de Seymour Duncan</h1>`;

        while (currentPage) {
            if (visitedPages.has(currentPage)) {
                console.log(`🔄 Página ya visitada, deteniendo: ${currentPage}`);
                break;
            }

            console.log(`📄 Procesando página: ${currentPage}`);
            visitedPages.add(currentPage);

            const { data } = await axios.get(currentPage);
            const $ = cheerio.load(data);

            // Extraer enlaces de productos
            const productLinks = [];
            $('a.woocommerce-loop-product__link').each((index, element) => {
                const link = $(element).attr('href');
                if (link) productLinks.push(link);
            });

            console.log(`🔗 Productos encontrados en esta página: ${productLinks.length}`);

            for (const link of productLinks) {
                let productCharts = await getProductCharts(link);

                // Intentar obtener gráficos con el selector #pa_position (opción 'set')
                const params = new URLSearchParams();
                params.append('pa_position', 'set');
                //const chartsWithSet = await getProductCharts(link, params);

                htmlContent += `
                    <div class="product">
                        <h2><a href="${link}" target="_blank">${link}</a></h2>
                        ${productCharts}
                    </div>
                `;
            }

            // Buscar el enlace a la siguiente página
            const nextPageLink = $('a.page-numbers.next').attr('href') || $('a.page-numbers').last().attr('href');
            if (nextPageLink && !visitedPages.has(nextPageLink)) {
                currentPage = nextPageLink;
            } else {
                console.log('🏁 No se encontraron más páginas.');
                break;
            }
        }

        htmlContent += `</body></html>`;

        // Guardar el archivo HTML
        fs.writeFileSync('product-charts.html', htmlContent);
        console.log('✅ Archivo HTML generado: product-charts.html');

    } catch (error) {
        console.error('❌ Error al hacer scraping:', error.message);
    }
}

// Ejecutar la función
scrapeProductCharts();
