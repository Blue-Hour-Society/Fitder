/**
 * MediaPipe Pose Core Logic
 * Handles 6 exercises: Squat, Push-up, Plank, Jumping Jacks, Sit-up, Pull-up
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type ExerciseType = "Squat" | "Push-up" | "Plank" | "Jumping Jacks" | "Sit-up" | "Pull-up" | "Unknown";

export interface ExerciseState {
  count: number;
  stage: "up" | "down" | "neutral" | "active" | "inactive";
  feedback: string;
}

// Helper to calculate angle between three points
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

export class RepCounter {
  count: number = 0;
  stage: string = "neutral";
  
  update(exercise: ExerciseType, landmarks: any): { count: number; feedback: string } {
    if (!landmarks || landmarks.length < 33) return { count: this.count, feedback: "Waiting for pose..." };

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    let feedback = "";

    switch (exercise) {
      case "Squat": {
        const angle = (calculateAngle(leftHip, leftKnee, leftAnkle) + calculateAngle(rightHip, rightKnee, rightAnkle)) / 2;
        if (angle > 160) this.stage = "up";
        if (angle < 90 && this.stage === "up") {
          this.stage = "down";
          this.count++;
          feedback = "Great depth!";
        }
        break;
      }
      case "Push-up": {
        const elbowAngle = (calculateAngle(leftShoulder, leftElbow, landmarks[15]) + calculateAngle(rightShoulder, rightElbow, landmarks[16])) / 2;
        if (elbowAngle > 160) this.stage = "up";
        if (elbowAngle < 90 && this.stage === "up") {
          this.stage = "down";
          this.count++;
          feedback = "Good push!";
        }
        break;
      }
      case "Plank": {
        const hipAngle = (calculateAngle(leftShoulder, leftHip, leftKnee) + calculateAngle(rightShoulder, rightHip, rightKnee)) / 2;
        if (hipAngle > 165 && hipAngle < 185) {
          feedback = "Perfect form! Hold it!";
          this.stage = "active";
        } else {
          feedback = "Keep your back straight!";
          this.stage = "inactive";
        }
        break;
      }
      case "Jumping Jacks": {
        const handDist = Math.abs(landmarks[15].y - landmarks[16].y);
        const legDist = Math.abs(leftAnkle.x - rightAnkle.x);
        if (handDist < 0.2 && legDist > 0.1) this.stage = "open";
        if (handDist > 0.5 && legDist < 0.05 && this.stage === "open") {
          this.stage = "closed";
          this.count++;
          feedback = "Keep jumping!";
        }
        break;
      }
      case "Sit-up": {
        const angle = (calculateAngle(leftShoulder, leftHip, leftKnee) + calculateAngle(rightShoulder, rightHip, rightKnee)) / 2;
        if (angle > 130) this.stage = "down";
        if (angle < 60 && this.stage === "down") {
          this.stage = "up";
          this.count++;
          feedback = "Core engaged!";
        }
        break;
      }
      case "Pull-up": {
        const mouthY = (landmarks[9].y + landmarks[10].y) / 2;
        const handsY = (landmarks[15].y + landmarks[16].y) / 2;
        if (handsY < mouthY) this.stage = "down";
        if (handsY > mouthY && this.stage === "down") {
          this.stage = "up";
          this.count++;
          feedback = "Nice pull!";
        }
        break;
      }
    }

    return { count: this.count, feedback };
  }

  reset() {
    this.count = 0;
    this.stage = "neutral";
  }
}
