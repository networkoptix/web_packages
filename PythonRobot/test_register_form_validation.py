import time

import robot_keywords
from RobotVariables import RobotVariables
from generic_element import Element
from resource_import import check_new_password_outline_and_error_message
from resource_import import check_password_badge
from resource_import import get_headless_chrome

rb = RobotVariables("en_US")
driver = get_headless_chrome()
driver.get(f'{rb.ENV}/authorize?client_type=create')


def test_register_invalid(driver, first, last, email, password, checked):
    driver.refresh()
    # Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL INVALID}
    # ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL INVALID TEXT}')]
    # Run Keyword If    "${LANGUAGE}"=="he_IL"    Set Suite Variable    ${EMAIL IS REQUIRED}
    # ...    //span[contains(@class,'input-error') and contains(text(),'${EMAIL IS REQUIRED TEXT}')]
    Element(driver, rb.REGISTER_FIRST_NAME_INPUT).wait_until_visible()
    Element(driver, rb.REGISTER_LAST_NAME_INPUT).wait_until_visible()
    Element(driver, rb.REGISTER_EMAIL_INPUT).wait_until_visible()
    Element(driver, rb.REGISTER_PASSWORD_INPUT).wait_until_visible()
    Element(driver, rb.CREATE_ACCOUNT_BUTTON).wait_until_visible()

    invisible_elements = [
                         rb.EMAIL_INVALID, 
                         rb.EMAIL_ALREADY_REGISTERED, 
                         rb.EMAIL_IS_REQUIRED, 
                         rb.PASSWORD_BADGE, 
                         rb.PASSWORD_IS_REQUIRED, 
                         rb.PASSWORD_SPECIAL_CHARS, 
                         rb.PASSWORD_IS_WEAK, 
                         rb.FIRST_NAME_IS_REQUIRED, 
                         rb.LAST_NAME_IS_REQUIRED, 
                         rb.TERMS_AND_CONDITIONS_ERROR
                         ]
    for element in invisible_elements:
        Element(driver, element).should_not_be_visible()
    register_form_validation(driver, first, last, email, password, checked)

    if password not in rl.GOOD_PASSWORDS and password not in rl.FAIR_PASSWORDS:
        check_new_password_outline_and_error_message(driver, password, rb.REGISTER_FORM, rb.REGISTER_PASSWORD_INPUT, "createAccountPassword")
    if email != rb.VALID_EMAIL:
        check_email_outline(driver, email)
    if first != "mark":
        check_first_name_outline(driver)
    if last != "hamill":
        check_last_name_outline(driver)
    if checked == False:
        check_terms_and_conditions_error(driver)

def register_form_validation(driver, first_name, last_name, email, password, checked):
    robot_keywords.input_text(driver, rb.REGISTER_FIRST_NAME_INPUT, first_name)
    robot_keywords.input_text(driver, rb.REGISTER_LAST_NAME_INPUT, last_name)
    robot_keywords.input_text(driver, rb.REGISTER_EMAIL_INPUT, email)
    Element(driver, rb.REGISTER_PASSWORD_INPUT).click()
    time.sleep(.1)
    robot_keywords.input_text(driver, rb.REGISTER_PASSWORD_INPUT, password)
    if password != "":
        check_password_badge(driver, password, rb.REGISTER_FORM)
    if checked:
        Element(driver, rb.TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE).click()
    time.sleep(.1)
    robot_keywords.click_button(driver, rb.CREATE_ACCOUNT_BUTTON)

def check_email_outline(driver, email):
    time.sleep(1)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_EMAIL_INPUT, "border-color", rb.ERROR_COLOR)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_EMAIL_INPUT, "color", rb.ERROR_COLOR_WITH_OPACITY)
    if email == "" or email == " ":
        Element(driver, rb.EMAIL_IS_REQUIRED).should_be_visible()
    if email == rb.EXISTING_EMAIL:
        Element(driver, rb.EMAIL_ALREADY_REGISTERED).should_be_visible()
    if email != "" and email != " " and email != rb.EXISTING_EMAIL:
        Element(driver, rb.EMAIL_INVALID).should_be_visible()

def check_first_name_outline(driver):
    robot_keywords.element_style_should_be(driver, rb.REGISTER_FIRST_NAME_INPUT, "border-bottom-color", rb.ERROR_COLOR_WITH_OPACITY)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_FIRST_NAME_INPUT, "border-top-color", rb.ERROR_COLOR_WITH_OPACITY)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_FIRST_NAME_INPUT, "border-right-color", rb.ERROR_COLOR_WITH_OPACITY)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_FIRST_NAME_INPUT, "border-left-color", rb.ERROR_COLOR_WITH_OPACITY)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_FIRST_NAME_INPUT, "color", rb.ERROR_COLOR_WITH_OPACITY)
    Element(driver, rb.FIRST_NAME_IS_REQUIRED).should_be_visible()

def check_last_name_outline(driver):
    robot_keywords.element_style_should_be(driver, rb.REGISTER_LAST_NAME_INPUT, "border-color", rb.ERROR_COLOR)
    robot_keywords.element_style_should_be(driver, rb.REGISTER_LAST_NAME_INPUT, "color", rb.ERROR_COLOR_WITH_OPACITY)
    Element(driver, rb.LAST_NAME_IS_REQUIRED).should_be_visible()

def check_terms_and_conditions_error(driver):
    Element(driver, rb.TERMS_AND_CONDITIONS_ERROR).wait_until_visible()


# test-cases
def invalid_email_1():
    """1. Register Invalid Email 1 noptixqagmail.com"""   
    test_register_invalid(driver, "mark", "hamill", "noptixqagmail.com", rb.BASE_PASSWORD, True)
    
def invalid_email_2():
    """2. Register Invalid Email 2 @gmail.com"""
    test_register_invalid(driver, "mark", "hamill", "@gmail.com", rb.BASE_PASSWORD, True)
 
def invalid_email_3():
    """3. Register Invalid Email 3 noptixqa@gmail..com"""
    test_register_invalid(driver, "mark", "hamill", "noptixqa@gmail..com", rb.BASE_PASSWORD, True)
    
def invalid_email_4():
    """4. Register Invalid Email 4 noptixqa@192.168.1.1.0"""
    test_register_invalid(driver, "mark", "hamill", "noptixqa@192.168.1.1.0", rb.BASE_PASSWORD, True)
    
def invalid_email_5():
    """5. Register Invalid Email 5 noptixqa.@gmail.com"""
    test_register_invalid(driver, "mark", "hamill", "noptixqa.@gmail.com", rb.BASE_PASSWORD, True)
    
def invalid_email_6():
    """6. Register Invalid Email 6 noptixq..a@gmail.c"""
    test_register_invalid(driver, "mark", "hamill", "noptixq..a@gmail.", rb.BASE_PASSWORD, True)
    
def invalid_email_7():
    """7. Register Invalid Email 7 noptixqa@-gmail.com"""
    test_register_invalid(driver, "mark", "hamill", "noptixqa@-gmail.com", rb.BASE_PASSWORD, True)
    
def invalid_email_8():
    """8. Register Invalid Email 8 space"""
    test_register_invalid(driver, "mark", "hamill", " ", rb.BASE_PASSWORD, True)
 
def invalid_email_9():
    """9. Register Invalid Email 9 myemail@"""
    test_register_invalid(driver, "mark", "hamill", "myemail@", rb.BASE_PASSWORD, True)
    
def invalid_email_10():
    """10. Register Invalid Email 10 myemail@gmail"""
    test_register_invalid(driver, "mark", "hamill", "myemail@gmail", rb.BASE_PASSWORD, True)
    
def invalid_email_11():
    """11. Register Invalid Email 11 myemail@.com"""
    test_register_invalid(driver, "mark", "hamill", "myemail@.com", rb.BASE_PASSWORD, True)
    
def invalid_email_12():
    """12. Register Invalid Email 12 my@email@gmail.com"""
    test_register_invalid(driver, "mark", "hamill", "my@email@gmail.com", rb.BASE_PASSWORD, True)
    
def invalid_email_13():
    """13. Register Invalid Email 13 myemail@ gmail.com"""
    test_register_invalid(driver, "mark", "hamill", "myemail@ gmail.com", rb.BASE_PASSWORD, True)
    
def invalid_email_14():
    """14. Register Invalid Email 14 myemail@gmail.com;"""
    test_register_invalid(driver, "mark", "hamill", "myemail@gmail.com;", rb.BASE_PASSWORD, True)
    
def empty_email():
    """15. Register Empty Email"""
    test_register_invalid(driver, "mark", "hamill", "", rb.BASE_PASSWORD, True)

def registered_email():
    """16. Register Registered Email"""                                
    test_register_invalid(driver, "mark", "hamill", rb.EXISTING_EMAIL, rb.BASE_PASSWORD, True)

def short_password():
    """17. Register Short Password asdfghj"""                        
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.SEVEN_CHAR_PASSWORD, True)

def weak_1_lowercase_password():
    """18. Register Weak 1 Lowercase Password adrhartjad"""            
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWERCASE_PASSWORD, True)

def weak_2_uppercase_password():
    """19. Register Weak 2 Uppercase Password ADRHARTJAD"""           
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.UPPERCASE_PASSWORD, True)

def weak_3_numbers_password():
    """20. Register Weak 3 Numbers Password 13462344"""                
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.NUMBERS_PASSWORD, True)

def weak_4_symbol_only_password():
    """21. Register Weak 4 Symbol only Password !@#$%^&*()_-+="""     
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.SYMBOL_ONLY_PASSWORD, True)

def fair_1_lower_and_uppercase():
    """22. Register Fair 1 Lower and Uppercase"""                      
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_UPPER_PASSWORD, True)

def fair_2_lowercase_and_numbers():
    """23. Register Fair 2 Lowercase and numbers"""                    
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_NUMBER_PASSWORD, True)

def fair_3_lowercase_and_symbols():
    """24. Register Fair 3 Lowercase and Symbols"""                    
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_SYMBOL_PASSWORD, True)

def fair_4_uppercase_and_numbers():
    """25. Register Fair 4 Uppercase and numbers"""                   
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.UPPER_NUMBER_PASSWORD, True)

def fair_5_uppercase_and_symbols():
    """26. Register Fair 5 Uppercase and Symbols"""                   
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.UPPER_SYMBOL_PASSWORD, True)

def fair_6_numbers_and_symbols():
    """27. Register Fair 6 Numbers and Symbols"""              
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.NUMBER_SYMBOL_PASSWORD, True)

def good_1():
    """28. Register Good 1 qweASD123"""                               
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_UPPER_NUMBER_PASSWORD, True)

def good_2():
    """29. Register Good 2 qweASD!@#"""
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_UPPER_SYMBOL_PASSWORD, True)

def good_3():
    """30. Register Good 3 qwe123!@#""" 
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.LOWER_NUMBER_SYMBOL_PASSWORD, True)

def good_4():
    """31. Register Good 4 QWE123!@#"""
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.UPPER_NUMBER_SYMBOL_PASSWORD, True)

def common_password():
    """32. Register Common Password qweasd123"""                  
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.COMMON_PASSWORD, True)

def cyrillic_password():
    """33. Register Cyrillic Password Кенгшщзх"""                 
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.CYRILLIC_TEXT, True)

def smiley_password():
    """34. Register Smiley Password ☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★"""
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.SMILEY_TEXT, True)

def glyph_password():
    """35. Register Glyph Password 您都可以享受源源不絕的好禮及優惠"""    
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.GLYPH_TEXT, True)

def tm_password():
    """36. Register TM Password qweasdzxc123®™"""
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.TM_TEXT, True)

def leading_space_password():
    """37. Register Leading Space Password"""                         
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, f' {rb.BASE_PASSWORD}', True)

def trailing_space_password(): 
    """38. Register Trailing Space Password"""                        
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, f'{rb.BASE_PASSWORD} ', True)

def middle_space_password():
    """39. Register Middle Space Password qweasd 123"""               
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.BASE_PASSWORD, True)

def empty_password():
    """40. Register Empty Password"""                                 
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, "", True)

def symbol_password():
    """41. Register Symbol Password pass!@#$%^&*()_-+=;:''`~,./\|?[]{}"""    
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.SYMBOL_PASSWORD, True)

def invalid_first_name():
    """42. Register Invalid First Name"""                             
    test_register_invalid(driver, " ", "hamill", rb.VALID_EMAIL, rb.BASE_PASSWORD, True)

def empty_first_name():    
    """43. Register Empty First Name"""                                
    test_register_invalid(driver, "", "hamill", rb.VALID_EMAIL, rb.BASE_PASSWORD, True)

def invalid_last_name():
    """44. Register Invalid Last Name"""                              
    test_register_invalid(driver, "mark", " ", rb.VALID_EMAIL, rb.BASE_PASSWORD, True)

def empty_last_name(): 
    """45. Register Empty Last Name"""                                 
    test_register_invalid(driver, "mark", "", rb.VALID_EMAIL, rb.BASE_PASSWORD, True)

def invalid_all():
    """46. Register Invalid All"""                                     
    test_register_invalid(driver, " ", " ", "noptixqagmail.com", rb.SEVEN_CHAR_PASSWORD, True)

def terms_unchecked():
    """47. Register Terms Unchecked"""                               
    test_register_invalid(driver, "mark", "hamill", rb.VALID_EMAIL, rb.BASE_PASSWORD, False)

def empty_all():
    """48. Register Empty All"""                                    
    test_register_invalid(driver, "", "", " ", "", False)

    

if __name__ == "__main__":
    invalid_email_1()
    print(f'{Fore.WHITE}{invalid_email_1.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_2()
    print(f'{Fore.WHITE}{invalid_email_2.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_3()
    print(f'{Fore.WHITE}{invalid_email_3.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_4()
    print(f'{Fore.WHITE}{invalid_email_4.__doc__}\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_5()
    print(f'{Fore.WHITE}{invalid_email_5.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_6()
    print(f'{Fore.WHITE}{invalid_email_6.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_7()
    print(f'{Fore.WHITE}{invalid_email_7.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_8()
    print(f'{Fore.WHITE}{invalid_email_8.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_9()
    print(f'{Fore.WHITE}{invalid_email_9.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_10()
    print(f'{Fore.WHITE}{invalid_email_10.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_11()
    print(f'{Fore.WHITE}{invalid_email_11.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_12()
    print(f'{Fore.WHITE}{invalid_email_12.__doc__}\t\t\t{Fore.GREEN}| PASS |')
    
    invalid_email_13()
    print(f'{Fore.WHITE}{invalid_email_13.__doc__}\t\t\t{Fore.GREEN}| PASS |')
  
    invalid_email_14()
    print(f'{Fore.WHITE}{invalid_email_14.__doc__}\t\t\t{Fore.GREEN}| PASS |')
  
    empty_email()
    print(f'{Fore.WHITE}{empty_email.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')
  
    registered_email()
    print(f'{Fore.WHITE}{registered_email.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')
 
    short_password()
    print(f'{Fore.WHITE}{short_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    weak_1_lowercase_password()
    print(f'{Fore.WHITE}{weak_1_lowercase_password.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    weak_2_uppercase_password()
    print(f'{Fore.WHITE}{weak_2_uppercase_password.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    weak_3_numbers_password()
    print(f'{Fore.WHITE}{weak_3_numbers_password.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    weak_4_symbol_only_password()
    print(f'{Fore.WHITE}{weak_4_symbol_only_password.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    fair_1_lower_and_uppercase()
    print(f'{Fore.WHITE}{fair_1_lower_and_uppercase.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    fair_2_lowercase_and_numbers()
    print(f'{Fore.WHITE}{fair_2_lowercase_and_numbers.__doc__}\t\t\t\t{Fore.GREEN}| PASS |') 

    fair_3_lowercase_and_symbols()
    print(f'{Fore.WHITE}{fair_3_lowercase_and_symbols.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    fair_4_uppercase_and_numbers()
    print(f'{Fore.WHITE}{fair_4_uppercase_and_numbers.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    fair_5_uppercase_and_symbols()
    print(f'{Fore.WHITE}{fair_5_uppercase_and_symbols.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    fair_6_numbers_and_symbols()
    print(f'{Fore.WHITE}{fair_6_numbers_and_symbols.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    good_1()
    print(f'{Fore.WHITE}{good_1.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    good_2()
    print(f'{Fore.WHITE}{good_2.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    good_3()
    print(f'{Fore.WHITE}{good_3.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    good_4()
    print(f'{Fore.WHITE}{good_4.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    common_password()
    print(f'{Fore.WHITE}{common_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    cyrillic_password()
    print(f'{Fore.WHITE}{cyrillic_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    smiley_password()
    print(f'{Fore.WHITE}{smiley_password.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    glyph_password()
    print(f'{Fore.WHITE}{glyph_password.__doc__}\t\t{Fore.GREEN}| PASS |')

    tm_password()
    print(f'{Fore.WHITE}{tm_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    leading_space_password()
    print(f'{Fore.WHITE}{leading_space_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    trailing_space_password()
    print(f'{Fore.WHITE}{trailing_space_password.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')

    middle_space_password()
    print(f'{Fore.WHITE}{middle_space_password.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    empty_password()
    print(f'{Fore.WHITE}{empty_password.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    symbol_password()
    print(f'{Fore.WHITE}{symbol_password.__doc__}\t\t{Fore.GREEN}| PASS |')

    invalid_first_name()
    print(f'{Fore.WHITE}{invalid_first_name.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    empty_first_name()
    print(f'{Fore.WHITE}{empty_first_name.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    invalid_last_name()
    print(f'{Fore.WHITE}{invalid_last_name.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    empty_last_name()
    print(f'{Fore.WHITE}{empty_last_name.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    invalid_all()
    print(f'{Fore.WHITE}{invalid_all.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    terms_unchecked()
    print(f'{Fore.WHITE}{terms_unchecked.__doc__}\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    empty_all()
    print(f'{Fore.WHITE}{empty_all.__doc__}\t\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    driver.close()
    
