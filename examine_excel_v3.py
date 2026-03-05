import openpyxl
file_path = "/Users/josh/Desktop/CotizadorAdeslas/Cotizador Base 2026 2.0  (1).xlsx"
wb = openpyxl.load_workbook(file_path, data_only=True)
sheet = wb['Cotizador']

for r in [6, 8, 10]:
    k_cell = f"K{r}"
    l_cell = f"L{r}" # Usually labels are in the next column or previous
    j_cell = f"J{r}"
    print(f"{j_cell}: {sheet[j_cell].value} | {k_cell}: {sheet[k_cell].value} | {l_cell}: {sheet[l_cell].value}")

# Check cells near the promotion section
for r in range(20, 25):
    print(f"I{r}: {sheet[f'I{r}'].value} | J{r}: {sheet[f'J{r}'].value} | K{r}: {sheet[f'K{r}'].value}")
