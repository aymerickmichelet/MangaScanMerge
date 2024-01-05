const fs = require('fs');
const { PDFDocument: PDFLib } = require('pdf-lib');
const path = require('path');

const mangaName = 'TokyoRevengers.pdf';
const directoryPath = '/Users/personnel/Documents/Mangas/Tokyo Revengers';
const directoryPathPDFs = '/Users/personnel/Documents/Mangas/Tokyo Revengers/PDF';

function listFilesOrDirectoryInDirectory(directoryPath, fileOrDirectory) {
    try {
        // Lire le contenu du dossier
        const elementNames = fs.readdirSync(directoryPath);
        
        let elementPaths = [];
        // Filtrer uniquement les fichiers ou les dossiers (exclure les dossiers ou les fichiers)
        if (fileOrDirectory === 'file') {
            elementPaths = elementNames
                .filter(elementName => fs.statSync(path.join(directoryPath, elementName)).isFile())
                .filter(elementName => elementName.toLowerCase().endsWith('.webp')
                    || elementName.toLowerCase().endsWith('.png')
                    || elementName.toLowerCase().endsWith('.jpeg')
                    || elementName.toLowerCase().endsWith('.jpg')
                    || elementName.toLowerCase().endsWith('.pdf'))
                .map(elementName => path.join(directoryPath, elementName));
        } else if (fileOrDirectory === 'directory') {
            elementPaths = elementNames
                .filter(elementName => fs.statSync(path.join(directoryPath, elementName)).isDirectory())
                .map(elementName => path.join(directoryPath, elementName));
        } else {
            console.error('Erreur lors de la lecture du dossier : la valeur fileOrDirectory ' + fileOrDirectory + ' n est pas prise en compte.');
            return [];
        }

        // Trier les fichiers par ordre alphabétique
        const sortedElementPaths = elementPaths.sort();

        return sortedElementPaths;
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier :', error);
        return [];
    }
}

async function mergePDFs(pdfPaths, outputPDFPath) {
    const mergedPdf = await PDFLib.create();

    for (const pdfPath of pdfPaths) {
        const pdfBytes = await fs.promises.readFile(pdfPath);
        const pdfDoc = await PDFLib.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    await fs.promises.writeFile(outputPDFPath, mergedPdfBytes);

    return `Les fichiers PDF ont été fusionnés avec succès à ${outputPDFPath}`;
}

const PDFList = listFilesOrDirectoryInDirectory(directoryPathPDFs, 'file');
mergePDFs(PDFList, path.join(directoryPath, mangaName))
    .then((msg) => console.log(`${msg}`))
    .catch(error => console.error('Une erreur est survenue:', error));