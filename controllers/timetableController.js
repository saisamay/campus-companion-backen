const Timetable = require('../models/Timetable');

// --- HELPER (from Step 2) ---
function normalizeGrid(grid) {
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  const out = [];
  for (let i = 0; i < days.length; i++){
    const dayName = days[i];
    const g = (grid && Array.isArray(grid) ? grid.find(d => d.dayName === dayName) : null);
    const slots = (g && g.slots && Array.isArray(g.slots) ? g.slots.slice() : []);
    while (slots.length < 9) {
      slots.push({ courseCode: '', courseName: '', facultyName: '', type: '', room: '', color: '#FFFFFFFF', startSlot: null, endSlot: null, isCancelled: false, newRoom: null });
    }
    if (slots.length > 9) slots.length = 9;
    out.push({ dayName, slots });
  }
  return out;
}

// ==========================================
// ADMIN FUNCTIONS (Existing)
// ==========================================

const addTimetable = async (req, res) => {
    try {
        const { semester, branch, section, grid } = req.body;
        if (!semester || !branch || !section) return res.status(400).json({ message: "Semester, Branch, and Section are required" });

        const existing = await Timetable.findOne({ semester: String(semester), branch: String(branch), section: String(section) });
        if (existing) return res.status(409).json({ message: "Timetable already exists. Please use Edit." });

        const newTimetable = new Timetable({
            semester, branch, section,
            grid: normalizeGrid(grid || []),
            createdBy: req.user ? req.user.id : null
        });
        await newTimetable.save();
        res.status(201).json({ success: true, timetable: newTimetable });
    } catch (error) {
        console.error("Add Timetable Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateTimetable = async (req, res) => {
    try {
        const { semester, branch, section, grid } = req.body;
        if (!semester || !branch || !section) return res.status(400).json({ message: "Semester, Branch, and Section are required" });

        const updated = await Timetable.findOneAndUpdate(
            { semester, branch, section },
            { $set: { grid: normalizeGrid(grid), updatedAt: new Date() } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Timetable not found to update." });
        res.json({ success: true, timetable: updated });
    } catch (error) {
        console.error("Update Timetable Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getTimetable = async (req, res) => {
    try {
        const { semester, branch, section } = req.query;
        if (!semester || !branch || !section) return res.status(400).json({ message: "Missing query params" });

        const timetable = await Timetable.findOne({ semester, branch, section });
        if (!timetable) return res.status(404).json({ message: "Timetable not found" });
        res.json({ success: true, timetable });
    } catch (error) {
        console.error("Get Timetable Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================================
// NEW: USER FUNCTIONS (Step 3)
// ==========================================

// @desc    Get "My" Timetable (Student/ClassRep)
// @route   GET /api/timetable/me
const getMyTimetable = async (req, res) => {
    try {
        // Use the safe user object attached by authMiddleware
        const { semester, branch, section } = req.user;

        if (!semester || !branch || !section) {
            return res.status(400).json({ message: "Your profile is missing Semester, Branch, or Section info." });
        }

        const timetable = await Timetable.findOne({ 
            semester: String(semester), 
            branch: String(branch), 
            section: String(section) 
        });

        if (!timetable) return res.status(404).json({ message: "No timetable found for your class." });
        
        res.json({ success: true, timetable });
    } catch (error) {
        console.error("My Timetable Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get "Teacher" Timetable (Aggregated from all classes)
// @route   GET /api/timetable/teacher
const getTeacherTimetable = async (req, res) => {
    try {
        const teacherName = req.user.name; // Must match 'facultyName' exactly
        if (!teacherName) return res.status(400).json({ message: "User name not found in profile." });

        // 1. Initialize an empty 5x9 grid
        const days = ['Mon','Tue','Wed','Thu','Fri'];
        const myGrid = days.map(day => ({
            dayName: day,
            slots: Array(9).fill(null).map(() => ({
                courseCode: '', courseName: '', facultyName: '', type: '', 
                room: '', color: '#FFFFFFFF', startSlot: null, endSlot: null,
                // Extra field to show WHICH class this is for
                displayContext: '' 
            }))
        }));

        // 2. Find ALL timetables where this teacher appears
        // Optimization: Only fetch documents that contain the name
        const allTimetables = await Timetable.find({
            "grid.slots.facultyName": teacherName
        });

        // 3. Loop through and fill *My* grid
        allTimetables.forEach(tt => {
            tt.grid.forEach(dayObj => {
                const myDay = myGrid.find(d => d.dayName === dayObj.dayName);
                if (!myDay) return;

                dayObj.slots.forEach((slot, index) => {
                    // If this slot belongs to the teacher
                    if (slot.facultyName === teacherName) {
                        // Copy slot data
                        myDay.slots[index] = {
                            ...slot.toObject(),
                            // Add context so teacher knows "Oh, this is S5 CSE A"
                            displayContext: `${tt.branch} S${tt.semester} ${tt.section}` 
                        };
                    }
                });
            });
        });

        res.json({ success: true, grid: myGrid });

    } catch (error) {
        console.error("Teacher Timetable Error:", error);
        res.status(500).json({ message: "Server error fetching teacher schedule" });
    }
};

// @desc    Update a specific slot (Cancel Class / Room Change)
// @route   PUT /api/timetable/slot
// @access  ClassRep (own section) or Teacher (own classes)
const updateSlot = async (req, res) => {
    try {
        const { semester, branch, section, dayName, slotIndex, isCancelled, newRoom } = req.body;

        // 1. Validate Inputs
        if (!semester || !branch || !section || !dayName || slotIndex === undefined) {
            return res.status(400).json({ message: "Missing required fields (sem, branch, sec, day, slotIndex)" });
        }

        // 2. Authorization Check
        if (req.user.role === 'classrep') {
            // ClassRep can only edit THEIR OWN section
            if (
                String(req.user.semester) !== String(semester) || 
                String(req.user.branch) !== String(branch) || 
                String(req.user.section) !== String(section)
            ) {
                return res.status(403).json({ message: "You can only edit your own class timetable." });
            }
        }
        // Teachers/Admins can edit any (or specific logic can be added for teachers)

        // 3. Find Timetable
        const timetable = await Timetable.findOne({ semester, branch, section });
        if (!timetable) return res.status(404).json({ message: "Timetable not found" });

        // 4. Find Day
        const dayObj = timetable.grid.find(d => d.dayName === dayName);
        if (!dayObj) return res.status(404).json({ message: "Invalid day" });

        // 5. Find Slot
        if (!dayObj.slots[slotIndex]) {
            return res.status(404).json({ message: "Invalid slot index" });
        }

        // 6. Update Fields
        // Only update if provided (allows sending just {isCancelled: true})
        if (isCancelled !== undefined) dayObj.slots[slotIndex].isCancelled = isCancelled;
        if (newRoom !== undefined) dayObj.slots[slotIndex].newRoom = newRoom;

        // 7. Save
        await timetable.save();

        // 8. Return updated slot (or full timetable if you prefer)
        res.json({ 
            success: true, 
            message: "Slot updated successfully", 
            updatedSlot: dayObj.slots[slotIndex] 
        });

    } catch (error) {
        console.error("Update Slot Error:", error);
        res.status(500).json({ message: "Server error updating slot" });
    }
};

module.exports = {
    addTimetable,
    updateTimetable,
    getTimetable,
    getMyTimetable,
    getTeacherTimetable,
    updateSlot
};