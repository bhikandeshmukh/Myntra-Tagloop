document.getElementById('loginBtn').addEventListener('click', async function () {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    const response = await fetch('users.json');
    const users = await response.json();

    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    } else {
        loginError.style.display = 'block';
    }
});

document.getElementById('logoutBtn').addEventListener('click', function () {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
});

document.getElementById('pdfUpload').addEventListener('change', function () {
    const fileLabel = document.getElementById('pdfFileLabel');
    if (this.files.length > 0) {
        fileLabel.textContent = `PDF file selected: ${this.files[0].name}`;
        fileLabel.classList.add('selected');
    } else {
        fileLabel.textContent = 'No PDF file selected';
        fileLabel.classList.remove('selected');
    }
});

document.getElementById('excelUpload').addEventListener('change', function () {
    const fileLabel = document.getElementById('excelFileLabel');
    if (this.files.length > 0) {
        fileLabel.textContent = `Excel file selected: ${this.files[0].name}`;
        fileLabel.classList.add('selected');
    } else {
        fileLabel.textContent = 'No Excel file selected';
        fileLabel.classList.remove('selected');
    }
});

document.getElementById('processBtn').addEventListener('click', async function () {
    const pdfFile = document.getElementById('pdfUpload').files[0];
    const excelFile = document.getElementById('excelUpload').files[0];
    const logArea = document.getElementById('logArea');
    const progressBar = document.querySelector('.progress');
    const downloadSection = document.getElementById('downloadSection');
    let processedPdfBytes;

    if (!pdfFile || !excelFile) {
        alert('Please upload both PDF and Excel files.');
        return;
    }

    progressBar.style.display = 'block';

    try {
        const excelData = await readExcelData(excelFile);
        logArea.innerHTML += 'Excel data loaded successfully.<br>';
        processedPdfBytes = await addTagloopToLabel(pdfFile, excelData);
        logArea.innerHTML += 'PDF processing completed successfully!<br>';
        downloadSection.style.display = 'block';
        alert('PDF processing completed successfully!');
    } catch (error) {
        logArea.innerHTML += `An error occurred: ${error.message}<br>`;
        alert(`An error occurred: ${error.message}`);
    } finally {
        progressBar.style.display = 'none';
    }

    document.getElementById('downloadBtn').addEventListener('click', function () {
        const blob = new Blob([processedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'output.pdf';
        link.click();
    });
});

async function readExcelData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const workbook = XLSX.read(event.target.result, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = {};
            XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1).forEach(row => {
                const invoiceNum = String(row[0]);
                data[invoiceNum] = {
                    buyer_name: String(row[1]),
                    sku_code: String(row[2]),
                    tagloop: String(row[3]),
                    awb: String(row[4])
                };
            });
            resolve(data);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
}

async function getTextFromPage(page) {
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
}

async function addTagloopToLabel(file, excelData) {
    const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pages = pdfDoc.getPages();

    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
    const pdf = await loadingTask.promise;

    for (let i = 0; i < pages.length; i += 2) {
        const shippingPage = pages[i];
        const invoicePage = await pdf.getPage(i + 2);
        const invoiceText = await getTextFromPage(invoicePage);

        for (const invoiceNum in excelData) {
            if (invoiceText.includes(invoiceNum)) {
                const tagloopText = `TagLoop: ${excelData[invoiceNum].tagloop}`;
                shippingPage.drawText(tagloopText, { x: 158.5, y: 46, size: 9, font: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold) });
                break;
            }
        }
    }
    return await pdfDoc.save();
}