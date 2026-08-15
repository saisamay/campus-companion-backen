const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const User = require('../models/User'); // To fetch Teacher details for the popup if needed

// @desc    Get real-time status of all classrooms
// @route   GET /api/classrooms/status
const getClassroomStatus = async (req, res) => {
  try {
    const { day, slotIndex } = req.query; 

    // 1. Get Static Rooms (Your existing database)
    const allRooms = await Classroom.find().lean();

    // 2. Validate Input (Default to current time if missing)
    if (!day || !slotIndex) {
      return res.json({ success: true, data: allRooms.map(r => ({ ...r, isOccupied: false })) });
    }

    const activeSlotIdx = parseInt(slotIndex); // 0-based index

    // 3. Find Active Classes from Timetables
    // We look for ANY timetable that has a class in this specific slot
    const activeTimetables = await Timetable.find({
      [`grid.dayName`]: day 
    }).select('branch semester section grid').lean();

    // 4. Build Occupancy Map
    const occupiedMap = {};

    activeTimetables.forEach(tt => {
      const dayData = tt.grid.find(d => d.dayName === day);
      if (dayData && dayData.slots[activeSlotIdx]) {
        const slot = dayData.slots[activeSlotIdx];
        
        // A room is occupied IF:
        // - A course is assigned
        // - It is NOT cancelled
        // - A room is assigned (either by Admin originally OR by CR/Teacher override)
        if (slot.courseCode && !slot.isCancelled) {
            // CR/Teacher's "newRoom" takes priority over Admin's "room"
            const activeRoom = slot.newRoom || slot.room;
            
            if (activeRoom) {
                // Normalize room name (trim spaces, uppercase) to match DB
                const cleanName = activeRoom.trim(); 
                occupiedMap[cleanName] = {
                    isOccupied: true,
                    className: `${tt.branch} ${tt.semester}-${tt.section}`,
                    subject: slot.courseName,
                    teacher: slot.teacher
                };
            }
        }
      }
    });

    // 5. Merge Data: Classrooms DB + Live Timetable Status
    const result = allRooms.map(room => {
      // Check if this room name exists in our 'occupied' list
      const status = occupiedMap[room.name.trim()] || occupiedMap[room.name]; 
      
      return {
        ...room, // Existing fields (name, capacity)
        isOccupied: !!status,
        currentClass: status || null // Info about who is inside
      };
    });

    res.json({ success: true, data: result });

  } catch (error) {
    console.error("Classroom Status Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getClassroomStatus };