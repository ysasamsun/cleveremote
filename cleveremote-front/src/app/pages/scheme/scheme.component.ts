import { Component, OnInit } from '@angular/core';
import { CoreDataService } from '../../services/core.data.service';

@Component({
  selector: 'scheme-page',
  templateUrl: './scheme.component.html',
})
export class SchemeComponent {
  constructor(private coreDataService: CoreDataService) {
  }

  // get schemeElement() {
  //   return this.coreDataService.currentDevice.schemes[0];
  // }
}