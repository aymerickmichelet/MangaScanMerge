const fs = require('fs');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib } = require('pdf-lib');
const path = require('path');
const Jimp = require('jimp');
const webp=require('webp-converter');

// const width = 1590, height = 2500;
const width = 595.28, height = 841.89; // A4

function createDirectory(directoryPath) {
    try {
        // Créer le dossier avec l'option { recursive: true }
        fs.mkdirSync(directoryPath, { recursive: true });

        console.log(`Le dossier a été créé avec succès à ${directoryPath}`);
    } catch (error) {
        if (error.code === 'EEXIST') {
            console.error(`Le dossier ${directoryPath} existe déjà.`);
        } else {
            console.error('Erreur lors de la création du dossier :', error);
        }
    }
}

function normalizeFolderNumbers(directoryPath, fileOrDirectory) {
    try {
        // Filtrer uniquement les dossiers
        const folderPaths = listFilesOrDirectoryInDirectory(directoryPath, fileOrDirectory);


        // Normaliser les numéros dans les noms de dossiers
        folderPaths.forEach(folderPath => {
            const [originalNumber, folderName] = extractNumberAndName(folderPath);
            const normalizedNumber = normalizeNumber(originalNumber);

            if (normalizedNumber !== originalNumber) {
                const newFolderPath = `${directoryPath}/${normalizedNumber} ${folderName}`;
                fs.renameSync(`${directoryPath}/${folderPath}`, newFolderPath);
                console.log(`Dossier renommé : ${folderPath} -> ${normalizedNumber} ${folderName} | originalNumber: ${originalNumber} - folderName: ${folderName} - normalizedNumber: ${normalizedNumber}`);
            }
        });

        console.log('Normalisation des numéros terminée.');
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier :', error);
    }
}

function extractNumberAndName(folderName) {
    const match = folderName.match(/^(\d+)\s?(.*)$/);
    if (match) {
        return [match[1], match[2].trim()];
    } else {
        return [null, folderName];
    }
}

function normalizeNumber(originalNumber) {
    if (originalNumber) {
        // Vérifier la longueur du numéro et normaliser si nécessaire
        const maxLength = 6;  // Ajustez cette valeur en fonction de vos besoins
        const currentLength = originalNumber.length;

        if (currentLength < maxLength) {
            return originalNumber.padStart(maxLength, '0');
        } else {
            return originalNumber;
        }
    } else {
        return null;
    }    
}

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

async function convertWebpToJPEG(imagePath) {

    //default value
    let jpegPath = imagePath;

    if (imagePath.toLowerCase().endsWith('.webp')) {
        // Créer le chemin de destination pour l'image JPEG
        jpegPath = imagePath.replace(/\.webp$/i, '.jpeg');

        // Convertir et enregistrer l'image au format JPEG avec Jimp
        const result = await webp.dwebp(imagePath, jpegPath, "-o", logging="-v");
    }

    // Retourner le nouveau chemin de l'image JPEG
    return jpegPath;
}

async function mergeImagesToPDF(imagePaths, outputPDFPath) {

    const pdfDoc = new PDFDocument({
        autoFirstPage: false,
        // size: [width, height]
        size: 'A4'
    });

    const pdfStream = fs.createWriteStream(outputPDFPath);
    pdfDoc.pipe(pdfStream);

    for (let imagePath of imagePaths) {
        imagePath = await convertWebpToJPEG(imagePath);
        const image = await Jimp.read(imagePath);
        image.resize(width, height);
        // image.resize(
        //     image.bitmap.width < width ? Jimp.AUTO : width,
        //     image.bitmap.height < height ? Jimp.AUTO : height);
        let imageData;
        if (imagePath.toLowerCase().endsWith('.jpg')
            || imagePath.toLowerCase().endsWith('.jpeg')) {
            imageData = await image.getBufferAsync(Jimp.MIME_JPEG);
        } else if (imagePath.toLowerCase().endsWith('.png')) {
            imageData = await image.getBufferAsync(Jimp.MIME_PNG); 
        }
        pdfDoc.addPage().image(imageData, 0, 0);
    }

    pdfDoc.end();

    return `Le fichier PDF a été créé avec succès à ${outputPDFPath}`;
}

/*
 identifier tt des chapitres (dossier) et les ordonners
 créer pdf pour chaque chapitre
 rassembler tout les pdf ensemble
*/

const mangaName = 'TokyoRevengers.pdf';
const directoryPath = '/Users/personnel/Documents/Mangas/Tokyo Revengers';
const directoryPathPDFs = '/Users/personnel/Documents/Mangas/Tokyo Revengers/PDF';

// normalisation des noms des dossiers de chapitre téléchargé
normalizeFolderNumbers(directoryPath, 'directory');

const folderPaths = listFilesOrDirectoryInDirectory(directoryPath, 'directory');
createDirectory(directoryPathPDFs);
for (const folderPath of folderPaths) {
    const folderName = folderPath.split('/').at(-1);
    const imagePaths = listFilesOrDirectoryInDirectory(folderPath, 'file');
    mergeImagesToPDF(imagePaths, path.join(directoryPathPDFs, folderName+'.pdf'))
        .then((msg) => console.log(`${msg}`))
        .catch(error => console.error('Une erreur est survenue:', error));
}
