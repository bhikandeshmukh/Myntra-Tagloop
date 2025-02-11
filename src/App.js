import React, { useState } from 'react';
import axios from 'axios';
import { Button, Container, CssBaseline, Grid, Typography, LinearProgress, TextField } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';

const theme = createTheme();

const useStyles = makeStyles({
  root: {
    padding: theme.spacing(4),
    textAlign: 'center',
  },
  header: {
    marginBottom: theme.spacing(4),
  },
  uploadSection: {
    marginBottom: theme.spacing(4),
  },
  logSection: {
    marginTop: theme.spacing(4),
  },
  log: {
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
  },
  progress: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
});

function App() {
  const classes = useStyles();
  const [pdfFile, setPdfFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [log, setLog] = useState('');
  const [progress, setProgress] = useState(false);

  const handlePdfChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleExcelChange = (e) => {
    setExcelFile(e.target.files[0]);
  };

  const handleProcess = async () => {
    if (!pdfFile || !excelFile) {
      alert('Please upload both PDF and Excel files.');
      return;
    }

    setProgress(true);
    setLog('Processing...\n');

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('excel', excelFile);

    try {
      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setLog((prevLog) => prevLog + response.data.log);
      alert('PDF processing completed successfully! Output saved as output.pdf');
    } catch (error) {
      setLog((prevLog) => prevLog + `Error: ${error.message}\n`);
    } finally {
      setProgress(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container className={classes.root}>
        <Typography variant="h4" className={classes.header}>
          Tagloop PDF Processor
        </Typography>
        <Grid container spacing={2} className={classes.uploadSection}>
          <Grid item xs={12} sm={6}>
            <Button variant="contained" component="label">
              Upload PDF file
              <input type="file" accept=".pdf" hidden onChange={handlePdfChange} />
            </Button>
            {pdfFile && <Typography variant="body2">{pdfFile.name}</Typography>}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button variant="contained" component="label">
              Upload Excel file
              <input type="file" accept=".xlsx" hidden onChange={handleExcelChange} />
            </Button>
            {excelFile && <Typography variant="body2">{excelFile.name}</Typography>}
          </Grid>
        </Grid>
        <Button variant="contained" color="primary" onClick={handleProcess} disabled={progress}>
          Process
        </Button>
        {progress && <LinearProgress className={classes.progress} />}
        <div className={classes.logSection}>
          <Typography variant="h6">Log:</Typography>
          <TextField
            className={classes.log}
            value={log}
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
          />
        </div>
      </Container>
    </ThemeProvider>
  );
}

export default App;