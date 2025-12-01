# Table Header Fix - How to Apply and Test

## 🔧 Fix Summary

This fix prevents table headers and section headings from being overwritten with internal identifiers (like "BG_ATN", "Material_CTG#") when updating Word documents.

**What was fixed:**
1. ✅ Table header row (row 0) now uses preserved `column_headers` metadata instead of cell text
2. ✅ Section heading paragraphs (like "3.Equipment Configuration") are preserved when they would be replaced with header identifiers

## 🚀 How to Apply the Fix

### Option 1: Auto-Reload (If backend is running with --reload)

If your backend is already running with the `--reload` flag, the changes should be automatically picked up. The server will detect the file change and reload.

**Check if auto-reload worked:**
- Look for a message in your backend terminal like: `INFO:     Detected file change in 'document_parser.py'. Reloading...`
- If you see this, the fix is already applied!

### Option 2: Manual Restart

If auto-reload didn't work or you want to be sure:

**Using the restart script:**
```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc
./RESTART_BACKEND.sh
```

**Or manually:**
```bash
# Stop the backend (Ctrl+C in the terminal running it, or):
lsof -ti :8000 | xargs kill -9

# Navigate to backend
cd /Users/abhisheklodh/Wireframe/docufix-poc/backend

# Activate virtual environment
source venv/bin/activate

# Start server
uvicorn main:app --reload --port 8000
```

## ✅ How to Test the Fix

### Test 1: Verify Table Headers Are Preserved

1. **Open a Word document** with tables (e.g., one with "Equipment Configuration" table)
2. **Edit the document** in the Word editor (update some missing values)
3. **Save the changes** to the Word document
4. **Check the table headers:**
   - Open the Word document
   - Verify that table header row still shows proper column names (e.g., "Equipment Name", "Configuration")
   - ❌ Should NOT see "BG_ATN" or "Material_CTG#" in the header row
   - ✅ Should see proper column headers like "Equipment Configuration", "Model Number", etc.

### Test 2: Verify Section Headings Are Preserved

1. **Open a Word document** with section headings like:
   - "3.Equipment Configuration"
   - "4.Verification Activities"
2. **Edit the document** and update missing values
3. **Save the changes** to the Word document
4. **Check the section headings:**
   - Open the Word document
   - Verify section headings are still correct:
     - ✅ "3.Equipment Configuration" (NOT "BG_ATN")
     - ✅ "4.Verification Activities" (NOT "Material_CTG#")

### Test 3: Verify Data Rows Still Update

1. **Edit a document** and change some cell values in data rows (not headers)
2. **Save the changes**
3. **Verify:**
   - ✅ Data rows (row 1 and below) are updated correctly
   - ✅ Only header row (row 0) and section headings are preserved

## 🔍 Debugging

### Check Backend Logs

When you save a document, you should see log messages like:

**For preserved headers:**
```
Restored header table 0, cell 0: 'BG_ATN' -> 'Equipment Configuration'
```

**For preserved section headings:**
```
PRESERVING section heading paragraph 5: '3.Equipment Configuration' (rejecting header identifier 'BG_ATN')
```

**For normal updates:**
```
Updated table 0, row 1, cell 0: 'Old Value' -> 'New Value'
```

### If Headers Are Still Being Overwritten

1. **Check the logs** - Look for the preservation messages above
2. **Verify the structure data** - The `column_headers` should be in the table metadata
3. **Check paragraph detection** - Section headings should be detected correctly

### Common Issues

**Issue:** Headers still showing "BG_ATN"
- **Solution:** Make sure the backend was restarted after the fix
- **Check:** Look for "Restored header" messages in logs

**Issue:** Section headings still being replaced
- **Solution:** Verify the paragraph text matches the detection patterns
- **Check:** Look for "PRESERVING section heading" messages in logs

## 📝 What Changed

### File Modified
- `backend/document_parser.py`

### Key Changes

1. **Header Row Preservation (lines ~721-730):**
   - Header row (row 0) now uses `column_headers` from table metadata
   - Prevents internal identifiers from overwriting display names

2. **Section Heading Preservation (lines ~706-755):**
   - Detects section headings (numbered paragraphs, keywords)
   - Prevents replacement with header identifiers
   - Conservative approach: only updates if new text is also valid

## 🎯 Expected Behavior After Fix

✅ **Table headers** (row 0) preserve original column names
✅ **Section headings** (like "3.Equipment Configuration") are not overwritten
✅ **Data rows** (row 1+) update normally with new values
✅ **Regular paragraphs** update normally unless they're section headings

## 📞 Need Help?

If the fix isn't working:
1. Check backend logs for error messages
2. Verify the backend restarted successfully
3. Test with a simple document first
4. Check that `column_headers` are present in the table metadata

