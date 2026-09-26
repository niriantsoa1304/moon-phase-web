from datetime import datetime, date
from astropy.time import Time
from astropy.coordinates import get_sun, get_body, Longitude
import astropy.units as u
import numpy as np

"""============================================================================================================================================================"""

class MoonPhaseCalculator:
    """ Calculate moon phase and illumination for any date """
      
    def calculate_phase_angle(self, observation_time):
        """ Calculate the phase angle (Sun-Moon-Earth angle) Returns angle in degrees (0 = full moon, 180 = new moon) """

        sun_pos = get_sun(observation_time)
        moon_pos = get_body('moon', observation_time)

        # Angular separation between Sun and Moon as seen from Earth (elongation)
        elongation = moon_pos.separation(sun_pos)
        
        # Standard approximation for phase angle
        phase_angle = 180 * u.deg - elongation
        
        return phase_angle.to(u.deg).value
    
    def calculate_illumination(self, phase_angle):
        """ Calculate percentage of moon's illuminated surface visible from Earth Formula: Illumination = (1 + cos(phase_angle)) / 2 * 100 """

        phase_rad = np.radians(phase_angle)
        illumination = (1 + np.cos(phase_rad)) / 2 * 100 

        return illumination
    
    def get_moon_age(self, observation_time):
        """ Calculate moon age (days since last new moon) using ecliptic longitude """

        sun = get_sun(observation_time)
        moon = get_body('moon', observation_time)

        moon_lon = Longitude(moon.geocentrictrueecliptic.lon)
        sun_lon = Longitude(sun.geocentrictrueecliptic.lon)
        
        # Difference in ecliptic longitude to get a 0-360 degree cycle
        elong = (moon_lon - sun_lon).wrap_at(360 * u.deg)
        
        synodic_month = 29.53058867  # Average length of a lunar cycle
        moon_age = (elong.value / 360.0) * synodic_month
        
        return moon_age

    def get_phase_name(self, moon_age):
        """Assign a name based on the current age in the 29.5 day cycle"""

        if moon_age < 1 or moon_age >= 28.5:
            return "New Moon"
        elif moon_age < 6.4:
            return "Waxing Crescent"
        elif moon_age < 8.4:
            return "First Quarter"
        elif moon_age < 13.8:
            return "Waxing Gibbous"
        elif moon_age < 15.8:
            return "Full Moon"
        elif moon_age < 21.1:
            return "Waning Gibbous"
        elif moon_age < 23.1:
            return "Last Quarter"
        else:
            return "Waning Crescent"
    
    def get_moon_phase_data(self, target_date):
        """Get complete moon phase information for a given date"""
        
        date_string = target_date.strftime("%Y-%m-%d")
        observation_time = Time(date_string)   
             
        phase_angle = self.calculate_phase_angle(observation_time)
        illumination = self.calculate_illumination(phase_angle)
        moon_age = self.get_moon_age(observation_time)
        phase_name = self.get_phase_name(moon_age)
        
        return {
            'date': target_date,
            'phase_name': phase_name,
            'illumination_percent': illumination,
            'phase_angle_degrees': phase_angle,
            'moon_age_days': moon_age
        }
    
    def display_phase(self, phase_info):
        """Print results and trigger image display"""

        print("\n" + "="*50)
        print("MOON PHASE CALCULATOR")
        print("="*50)
        print(f"Date: {phase_info['date']}")
        print(f"Phase: {phase_info['phase_name']}")
        print(f"Illumination: {phase_info['illumination_percent']:.1f}%")
        print(f"Phase Angle: {phase_info['phase_angle_degrees']:.1f}°")
        print(f"Moon Age: {phase_info['moon_age_days']:.2f} days")
        
        self.show_moon_image(phase_info['phase_name'])
    
    @staticmethod    
    def show_moon_image(phase):
        """Display the corresponding moon image using Matplotlib"""
        from PIL import Image
        import matplotlib.pyplot as plt

        img_mapping = {
            "New Moon": "new_moon.png",
            "Waxing Crescent": "waxing_crescent.png",
            "First Quarter": "first_quarter.png",
            "Waxing Gibbous": "waxing_gibbous.png",
            "Full Moon": "full_moon.png",
            "Waning Gibbous": "waning_gibbous.png",
            "Last Quarter": "last_quarter.png",
            "Waning Crescent": "waning_crescent.png"
        }
        
        file_path = "img_moon/" + img_mapping.get(phase, "new_moon.png")
        
        try:
            img = Image.open(file_path)
            plt.imshow(img)
            plt.axis('off') 
            plt.title(f"Visual: {phase}")
            plt.show()
        except FileNotFoundError:
            print(f"\n[Image not found: {file_path}]")

"""============================================================================================================================================================"""
            
def main():
    print("\nWelcome to the Moon Phase Calculator!")
    print("-" * 40)
    
    calculator = MoonPhaseCalculator()
    
    while True:
        print("\nOptions:")
        print("1. Get today's moon phase")
        print("2. Get moon phase for a specific date")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            today = datetime.now().date()
            phase_info = calculator.get_moon_phase_data(today)
            calculator.display_phase(phase_info)
            
        elif choice == '2':
            date_str = input("Enter date (YYYY-MM-DD): ").strip()
            try:
                target_date = date.fromisoformat(date_str)
                phase_info = calculator.get_moon_phase_data(target_date)
                calculator.display_phase(phase_info)
            except ValueError:
                print("Error: Invalid date format. Please use YYYY-MM-DD.")      
        
        elif choice == '3':
            print("\nClear skies! Thank you for using the Moon Phase Calculator.")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")

"""============================================================================================================================================================"""

if __name__ == "__main__":
    main()