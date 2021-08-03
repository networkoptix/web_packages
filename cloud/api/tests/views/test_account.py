from api.views.account import *
import pytest

class TestAccountViews:

    @pytest.fixture(autouse=True)
    def setup(self, django_user_model, arf):
        self.email = 'user_email@test.com'
        self.password = "wasd1234"
        self.user = django_user_model(email=self.email)
        self.session = {'login': self.email, 'password': self.password}
    
    def test_review_cookie(self, arf):
        assert self.user.cookie_reviewed == False
        request = arf.post(f'/api/account/reviewCookie')
        request.session = self.session
        request.user = self.user
        response = review_cookie(request)
        assert response.status_code == status.HTTP_200_OK
        assert self.user.cookie_reviewed == True
        