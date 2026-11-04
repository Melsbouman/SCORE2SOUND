// De herkenning verzint geen wisselingen van maatsoort. Een maat die langer of korter is dan de maatsoort is bijna altijd
// een leesfout in de noten; de app meldt dat ("Maat N duurt ...") en laat de maatsoort zoals Audiveris hem las.
export function herstelMaatsoorten(partituur) {
  return structuredClone(partituur);
}
