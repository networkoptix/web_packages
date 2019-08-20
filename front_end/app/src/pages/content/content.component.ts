import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';


@Component({
    selector   : 'content-component',
    templateUrl: 'content.component.html',
    styleUrls  : [ 'content.component.scss' ]
})

export class NxContentComponent implements OnInit {
    private title: string;
    private body: string;
    private articleParam: string;

    private setupDefaults() {
        this.title = '';
        this.body = '';
    }

    constructor(private route: ActivatedRoute,
                private http: HttpClient,
                private location: Location) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.articleParam = this.route.snapshot.paramMap.get('article_param');
        this.getArticle();
    }

    getArticle() {
        this.http.get(`/api/article/${this.articleParam}/`).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = data.body;
            },
            error => {
                if (error.status === 404) {
                    this.location.go('404');
                }
            }
        );
    }
}

